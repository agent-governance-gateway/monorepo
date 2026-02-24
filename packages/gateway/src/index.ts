import Fastify, { type FastifyInstance } from "fastify";
import { installGlobals, type ConfigFactory } from "@acp/config";
import {
  ACPError,
  INTERNAL_HEADERS,
  type ACPConfig,
  type ApprovalStore,
} from "@acp/core";
import { PostgresApprovalStore } from "@acp/approvals";
import { stdoutJsonSink } from "@acp/audit";
import { createOpaClient } from "@acp/opa";
import { createTelemetry } from "@acp/telemetry";
import { isSuccessStatus } from "@acp/utils";
import { emitAudit } from "./internal/audit.js";
import {
  generateTaskId,
  getApprovalBinding,
  sameBinding,
  verifyDecisionSignature,
} from "./internal/approval.js";
import { loadDefaultExports, loadPlugins, type LoadedPlugins } from "./internal/plugins.js";
import { proxyUpstream } from "./internal/proxy.js";
import { buildCanonical, buildRequestContext, chooseTool, getBodyBuffer, resolvePrincipal } from "./internal/request.js";
import { matchRule, pickRouteAction } from "./internal/routing.js";
import { InMemoryApprovalStore } from "./internal/store.js";

export type GatewayRuntime = {
  app: FastifyInstance;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  config: ACPConfig;
};

export async function createGateway(input: ACPConfig | ConfigFactory, options?: { cwd?: string }): Promise<GatewayRuntime> {
  const cwd = options?.cwd ?? process.cwd();
  const config = typeof input === "function" ? input({ cwd }) : input;

  installGlobals();
  const plugins = await loadPlugins(config, cwd);

  const approvalStore: ApprovalStore = config.approvalsRuntime?.store.type === "postgres"
    ? new PostgresApprovalStore({ url: config.approvalsRuntime.store.url })
    : new InMemoryApprovalStore();

  if (approvalStore instanceof PostgresApprovalStore) {
    await approvalStore.connect();
  }

  const approvalHandlers = new Map(plugins.approvals.map((handler) => [handler.id, handler]));
  const selectedSinks = config.audit?.sinks?.length
    ? plugins.sinks.filter((sink) => config.audit?.sinks.includes(sink.id))
    : plugins.sinks;
  const auditSinks = selectedSinks.length ? selectedSinks : [stdoutJsonSink];

  const opa = createOpaClient(config.opa ? { enabled: config.opa.enabled, url: config.opa.url } : undefined);
  const telemetry = await createTelemetry(config.otel);

  const app = Fastify({ logger: false, bodyLimit: 1024 * 1024 * 8 });

  const basePath = config.gateway.basePath ?? "";
  const route = (suffix: string): string => `${basePath}${suffix}`;

  app.get(route("/healthz"), async () => ({ ok: true }));

  app.get(route("/approvals/:id"), async (req, reply) => {
    const span = telemetry.startSpan("acp.approval");
    try {
      const task = await approvalStore.get((req.params as { id: string }).id);
      if (!task) {
        return reply.status(404).send({ error: "not_found" });
      }
      return reply.send(task);
    } finally {
      span.end();
    }
  });

  app.post(route("/approvals/:id/decision"), async (req, reply) => {
    const span = telemetry.startSpan("acp.approval");
    try {
      const body = req.body as { status: "approved" | "denied"; decidedBy?: string; reason?: string };
      if (config.approvalsRuntime?.decisionSigningSecret) {
        const signature = req.headers["x-acp-signature"] as string | undefined;
        const ok = verifyDecisionSignature(config.approvalsRuntime.decisionSigningSecret, body, signature);
        if (!ok) {
          return reply.status(401).send({ error: "invalid_signature" });
        }
      }

      await approvalStore.setDecision((req.params as { id: string }).id, {
        status: body.status,
        decidedBy: body.decidedBy,
        decisionReason: body.reason,
      });

      await emitAudit(auditSinks, {
        ts: new Date().toISOString(),
        kind: "approval_decided",
        canonical: {
          principal: {},
          channel: "http",
          request: { method: "POST", host: "gateway", path: route("/approvals/:id/decision") },
          target: {},
        },
        outcome: { status: "allowed", reason: body.status },
      });

      return reply.send({ status: body.status });
    } finally {
      span.end();
    }
  });

  app.all(route("/*"), async (req, reply) => {
    const requestSpan = telemetry.startSpan("acp.request");
    const body = getBodyBuffer(req);
    const ctx = buildRequestContext(req);
    const principal = await resolvePrincipal(plugins.principals, ctx);
    telemetry.annotatePrincipal(requestSpan, principal);

    const tool = chooseTool(plugins.tools, ctx);
    const canonical = buildCanonical(ctx, principal, tool.normalize(ctx, body), body);

    await emitAudit(auditSinks, {
      ts: new Date().toISOString(),
      kind: "request",
      canonical,
      outcome: { status: "allowed" },
    });

    try {
      const approvalTaskId = typeof req.headers[INTERNAL_HEADERS.APPROVAL_TASK_ID] === "string"
        ? (req.headers[INTERNAL_HEADERS.APPROVAL_TASK_ID] as string)
        : undefined;

      if (approvalTaskId) {
        const task = await approvalStore.get(approvalTaskId);
        if (!task) {
          throw new ACPError("approval_not_found", "approval task not found", 404);
        }
        if (task.status === "consumed") {
          throw new ACPError("already_consumed", "approval task already consumed", 409);
        }
        if (task.status !== "approved") {
          throw new ACPError("not_approved", `approval task is ${task.status}`, 409);
        }
        if (!sameBinding(task, canonical)) {
          throw new ACPError("binding_mismatch", "approval binding mismatch", 409);
        }

        const result = await proxyUpstream(req, reply, body);
        telemetry.recordLatency("acp.upstream.latency_ms", result.latencyMs);
        if (isSuccessStatus(result.status)) {
          await approvalStore.markConsumed(
            approvalTaskId,
            typeof req.headers["x-idempotency-key"] === "string" ? req.headers["x-idempotency-key"] : "none",
          );
        }

        await emitAudit(auditSinks, {
          ts: new Date().toISOString(),
          kind: "executed",
          canonical,
          outcome: { status: "executed", upstreamStatus: result.status, latencyMs: result.latencyMs },
        });

        telemetry.incrementCounter("acp.executed.count", 1);
        return;
      }

      const policySpan = telemetry.startSpan("acp.policy");
      let action = pickRouteAction(config, ctx, principal, canonical.target);
      if (action.type === "enforcePolicy") {
        const decision = await opa.evaluate(canonical);
        if (decision.decision === "allow") {
          action = { type: "passThrough" };
        } else if (decision.decision === "deny") {
          action = { type: "deny", reason: decision.reason ?? "opa_deny" };
        } else {
          action = {
            type: "requireApproval",
            handler: config.approvalsRuntime?.defaultHandlerId ?? "noop",
            ttlMs: 15 * 60 * 1000,
          };
        }
      }
      policySpan.end();

      if (action.type === "deny") {
        telemetry.incrementCounter("acp.denied.count", 1);
        await emitAudit(auditSinks, {
          ts: new Date().toISOString(),
          kind: "error",
          canonical,
          outcome: { status: "denied", reason: action.reason },
        });
        return reply.status(403).send({ error: "denied", reason: action.reason });
      }

      if (action.type === "requireApproval") {
        const taskId = generateTaskId();
        const ttlMs = action.ttlMs ?? 15 * 60 * 1000;
        const binding = getApprovalBinding(canonical);

        await approvalStore.create({
          id: taskId,
          status: "pending",
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + ttlMs),
          principalKey: binding.principalKey,
          method: binding.method,
          host: binding.host,
          path: binding.path,
          approvalBind: binding.approvalBind,
          reason: `approval_required_by_route:${action.handler}`,
        });

        const handler = approvalHandlers.get(action.handler);
        if (handler) {
          await handler.request({
            taskId,
            canonical,
            reason: "route requires approval",
            decisionUrl: `http://localhost:${config.gateway.port}${route(`/approvals/${taskId}/decision`)}`,
          });
        }

        telemetry.incrementCounter("acp.approval_required.count", 1);
        await emitAudit(auditSinks, {
          ts: new Date().toISOString(),
          kind: "approval_required",
          canonical,
          outcome: { status: "approval_required", reason: action.handler },
        });

        return reply.status(202).send({
          status: "approval_required",
          approval_task_id: taskId,
          poll_url: route(`/approvals/${taskId}`),
          reason: "route requires approval",
        });
      }

      const upstreamSpan = telemetry.startSpan("acp.upstream");
      const result = await proxyUpstream(req, reply, body);
      upstreamSpan.end();

      telemetry.recordLatency("acp.upstream.latency_ms", result.latencyMs);
      telemetry.incrementCounter("acp.request.count", 1);

      await emitAudit(auditSinks, {
        ts: new Date().toISOString(),
        kind: "executed",
        canonical,
        outcome: { status: "executed", upstreamStatus: result.status, latencyMs: result.latencyMs },
      });
      return;
    } catch (error) {
      telemetry.incrementCounter("acp.error.count", 1);
      const e = error instanceof ACPError ? error : new ACPError("internal", "internal error", 500);

      await emitAudit(auditSinks, {
        ts: new Date().toISOString(),
        kind: "error",
        canonical,
        outcome: { status: "error", reason: e.code },
      });

      return reply.status(e.statusCode).send({ error: e.code, message: e.message, details: e.details });
    } finally {
      requestSpan.end();
    }
  });

  return {
    app,
    config,
    async start(): Promise<void> {
      await app.listen({ port: config.gateway.port, host: "0.0.0.0" });
    },
    async stop(): Promise<void> {
      await app.close();
      if (approvalStore instanceof PostgresApprovalStore) {
        await approvalStore.close();
      }
      await telemetry.shutdown();
      for (const sink of auditSinks) {
        if (sink.flush) {
          await sink.flush();
        }
      }
    },
  };
}

export { type LoadedPlugins, loadDefaultExports };

export const __testing = {
  matchRule,
  pickRouteAction,
  sameBinding,
  resolvePrincipal,
};
