import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { installGlobals, type ConfigFactory } from "@acp/config";
import {
  ACPError,
  INTERNAL_HEADERS,
  toStablePrincipalKey,
  type ACPConfig,
  type ApprovalTask,
  type Principal,
  type ApprovalStore,
  type AuditSink,
  type AuditEvent,
  type RequestContext,
  type ToolAfterRequestMeta,
  type ToolPack,
} from "@acp/core";
import { createDatabase, type ACPDatabase } from "@acp/db";
import { InMemoryApprovalStore, PostgresApprovalStore } from "@acp/approvals";
import { stdoutJsonSink } from "@acp/audit";
import { createOpaClient } from "@acp/opa";
import { createTelemetry } from "@acp/telemetry";
import { isSuccessStatus } from "@acp/utils";
import { emitAudit } from "./internal/audit.js";
import {
  generateTaskId,
  getApprovalBinding,
  sameBinding,
} from "./internal/approval.js";
import { loadDefaultExports, loadPlugins, type LoadedPlugins } from "./internal/plugins.js";
import { proxyUpstream } from "./internal/proxy.js";
import {
  buildCanonical,
  buildMcpRequestContext,
  buildRequestContext,
  chooseTool,
  getBodyBuffer,
  resolvePrincipal,
} from "./internal/request.js";
import { matchRule, pickRouteAction } from "./internal/routing.js";

export type GatewayRuntime = {
  app: FastifyInstance;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  config: ACPConfig;
};

export type ShutdownBinding = {
  unbind: () => void;
};

export type RunGatewayOptions = {
  cwd?: string;
  bindSignals?: boolean;
  exitOnSignal?: boolean;
  exitOnError?: boolean;
  onError?: (error: unknown) => void;
  logStartup?: boolean;
};

export async function createGateway(input: ACPConfig | ConfigFactory, options?: { cwd?: string }): Promise<GatewayRuntime> {
  const cwd = options?.cwd ?? process.cwd();
  const config = typeof input === "function" ? input({ cwd }) : input;
  const storeType = config.store.type;
  const dbUrl = storeType === "postgres" ? config.store.connection.url : undefined;
  let sharedDb: ACPDatabase | undefined;
  if (dbUrl) {
    sharedDb = createDatabase(dbUrl);
    await sharedDb.connect();
  }

  installGlobals();
  const plugins = await loadPlugins(config, cwd);

  let approvalStore: ApprovalStore = new InMemoryApprovalStore();
  if (storeType === "postgres") {
    if (!dbUrl) {
      throw new ACPError("config_error", "store.connection.url is required for postgres store", 500);
    }
    approvalStore = sharedDb
      ? new PostgresApprovalStore({ database: sharedDb })
      : new PostgresApprovalStore({ url: dbUrl });
  }

  if (approvalStore instanceof PostgresApprovalStore) {
    await approvalStore.connect();
  }

  const approvalHandlers = new Map(plugins.approvals.map((handler) => [handler.id, handler]));
  const builtInSinks: AuditSink[] = [stdoutJsonSink];
  const sinkById = new Map<string, AuditSink>();
  for (const sink of [...plugins.sinks, ...builtInSinks]) {
    if (!sinkById.has(sink.id)) {
      sinkById.set(sink.id, sink);
    }
  }

  const configuredSinkIds = config.audit?.sinks;
  const defaultSinkIds = buildDefaultAuditSinkIds();
  const selectedSinkIds = configuredSinkIds?.length ? [...configuredSinkIds] : [...defaultSinkIds];
  const selectedSinks = selectedSinkIds.map((id) => sinkById.get(id)).filter((sink): sink is AuditSink => Boolean(sink));
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
      const principal = await resolvePrincipal(plugins.principals, buildRequestContext(req));
      if (!ownsTask(task, principal)) {
        return reply.status(403).send({ error: "forbidden" });
      }
      return reply.send(task);
    } finally {
      span.end();
    }
  });

  app.post(route("/approvals/:id/decision"), async (req, reply) => {
    const span = telemetry.startSpan("acp.approval");
    try {
      const requestId = crypto.randomUUID();
      const body = req.body as { status: "approved" | "denied"; decidedBy?: string; reason?: string };
      const task = await approvalStore.get((req.params as { id: string }).id);
      if (!task) {
        return reply.status(404).send({ error: "not_found" });
      }
      const principal = await resolvePrincipal(plugins.principals, buildRequestContext(req));
      if (!ownsTask(task, principal)) {
        return reply.status(403).send({ error: "forbidden" });
      }
      const canonicalForDecision = {
        principal,
        channel: "http" as const,
        request: { method: "POST", host: "gateway", path: route("/approvals/:id/decision") },
        target: {},
      };
      await persistRequestRecord(sharedDb, requestId, canonicalForDecision);

      await approvalStore.setDecision((req.params as { id: string }).id, {
        status: body.status,
        decidedBy: body.decidedBy ?? principal.agentId ?? principal.serviceId ?? principal.userId,
        decisionReason: body.reason,
      });

      const event: AuditEvent = {
        ts: new Date().toISOString(),
        kind: "approval_decided",
        canonical: canonicalForDecision,
        outcome: { status: "allowed", reason: body.status },
      };
      await writeAudit(sharedDb, auditSinks, event, requestId);

      return reply.send({ status: body.status });
    } finally {
      span.end();
    }
  });

  const handleProxyRequest = async (req: FastifyRequest, reply: FastifyReply, ctx: RequestContext) => {
    const requestSpan = telemetry.startSpan("acp.request");
    const requestId = crypto.randomUUID();
    const body = getBodyBuffer(req);
    const principal = await resolvePrincipal(plugins.principals, ctx);
    telemetry.annotatePrincipal(requestSpan, principal);

    const tool = chooseTool(plugins.tools, ctx);
    const canonical = buildCanonical(ctx, principal, tool.normalize(ctx, body), body);
    const upstreamUrl = resolveUpstreamUrl(tool, ctx, body, req);
    await persistRequestRecord(sharedDb, requestId, canonical);

    const requestEvent: AuditEvent = {
      ts: new Date().toISOString(),
      kind: "request",
      canonical,
      outcome: { status: "allowed" },
    };
    await writeAudit(sharedDb, auditSinks, requestEvent, requestId);

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

        const result = await executeUpstreamWithToolMeta(tool, ctx, canonical, body, req, reply, upstreamUrl);
        telemetry.recordLatency("acp.upstream.latency_ms", result.upstream.latencyMs);
        if (isSuccessStatus(result.upstream.status)) {
          await approvalStore.markConsumed(
            approvalTaskId,
            typeof req.headers["x-idempotency-key"] === "string" ? req.headers["x-idempotency-key"] : "none",
          );
        }

        const event: AuditEvent = {
          ts: new Date().toISOString(),
          kind: "executed",
          canonical,
          outcome: {
            status: "executed",
            upstreamStatus: result.upstream.status,
            latencyMs: result.upstream.latencyMs,
            cost: result.meta.cost,
            costReason: result.meta.reason,
            metadata: result.meta.metadata,
          },
        };
        await writeAudit(sharedDb, auditSinks, event, requestId);
        await persistCostEvent(sharedDb, requestId, result.meta, result.upstream);

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
            handler: "noop",
            ttlMs: 15 * 60 * 1000,
          };
        }
      }
      policySpan.end();

      if (action.type === "deny") {
        telemetry.incrementCounter("acp.denied.count", 1);
        const event: AuditEvent = {
          ts: new Date().toISOString(),
          kind: "error",
          canonical,
          outcome: { status: "denied", reason: action.reason },
        };
        await writeAudit(sharedDb, auditSinks, event, requestId);
        return reply.status(403).send({ error: "denied", reason: action.reason });
      }

      if (action.type === "requireApproval") {
        const taskId = generateTaskId();
        const ttlMs = action.ttlMs ?? 15 * 60 * 1000;
        const binding = getApprovalBinding(canonical);

        await approvalStore.create({
          id: taskId,
          requestId,
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
        const event: AuditEvent = {
          ts: new Date().toISOString(),
          kind: "approval_required",
          canonical,
          outcome: { status: "approval_required", reason: action.handler },
        };
        await writeAudit(sharedDb, auditSinks, event, requestId);

        return reply.status(202).send({
          status: "approval_required",
          approval_task_id: taskId,
          poll_url: route(`/approvals/${taskId}`),
          reason: "route requires approval",
        });
      }

      const upstreamSpan = telemetry.startSpan("acp.upstream");
      const result = await executeUpstreamWithToolMeta(tool, ctx, canonical, body, req, reply, upstreamUrl);
      upstreamSpan.end();

      telemetry.recordLatency("acp.upstream.latency_ms", result.upstream.latencyMs);
      telemetry.incrementCounter("acp.request.count", 1);

      const event: AuditEvent = {
        ts: new Date().toISOString(),
        kind: "executed",
        canonical,
        outcome: {
          status: "executed",
          upstreamStatus: result.upstream.status,
          latencyMs: result.upstream.latencyMs,
          cost: result.meta.cost,
          costReason: result.meta.reason,
          metadata: result.meta.metadata,
        },
      };
      await writeAudit(sharedDb, auditSinks, event, requestId);
      await persistCostEvent(sharedDb, requestId, result.meta, result.upstream);
      return;
    } catch (error) {
      telemetry.incrementCounter("acp.error.count", 1);
      const e = error instanceof ACPError ? error : new ACPError("internal", "internal error", 500);

      const event: AuditEvent = {
        ts: new Date().toISOString(),
        kind: "error",
        canonical,
        outcome: { status: "error", reason: e.code },
      };
      await writeAudit(sharedDb, auditSinks, event, requestId);

      return reply.status(e.statusCode).send({ error: e.code, message: e.message, details: e.details });
    } finally {
      requestSpan.end();
    }
  };

  app.post(route("/mcp"), async (req, reply) => {
    const ctx = buildMcpRequestContext(req);
    return handleProxyRequest(req, reply, ctx);
  });

  app.post(route("/mcp/*"), async (req, reply) => {
    const ctx = buildMcpRequestContext(req);
    return handleProxyRequest(req, reply, ctx);
  });

  app.all(route("/*"), async (req, reply) => {
    const ctx = buildRequestContext(req);
    return handleProxyRequest(req, reply, ctx);
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
      if (sharedDb) {
        await sharedDb.close();
      }
      await telemetry.shutdown();
      for (const sink of auditSinks) {
        if (sink.flush) {
          await sink.flush();
        }
        if (sink.close) {
          await sink.close();
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

export async function runGateway(
  input: ACPConfig | ConfigFactory,
  options?: RunGatewayOptions,
): Promise<GatewayRuntime & { signalBinding?: ShutdownBinding }> {
  try {
    const gateway = await createGateway(input, { cwd: options?.cwd });
    await gateway.start();
    if (options?.logStartup !== false) {
      console.log(`ACP gateway is running on http://localhost:${gateway.config.gateway.port}`);
    }
    const signalBinding = options?.bindSignals === false
      ? undefined
      : bindProcessSignals(async () => gateway.stop(), { exit: options?.exitOnSignal ?? true });
    return { ...gateway, signalBinding };
  } catch (error) {
    if (options?.onError) {
      options.onError(error);
    }
    if (options?.exitOnError) {
      if (!options?.onError) {
        console.error(error);
      }
      process.exit(1);
    }
    throw error;
  }
}

export function bindProcessSignals(
  onStop: () => Promise<void> | void,
  options?: { exit?: boolean },
): ShutdownBinding {
  let stopped = false;
  const shutdown = async () => {
    if (stopped) {
      return;
    }
    stopped = true;
    await onStop();
    if (options?.exit ?? true) {
      process.exit(0);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  return {
    unbind: () => {
      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);
    },
  };
}

function buildDefaultAuditSinkIds(): string[] {
  return ["stdout", "stdout-json"];
}

function ownsTask(task: ApprovalTask, principal: Principal): boolean {
  return task.principalKey === toStablePrincipalKey(principal);
}

async function runAfterRequest(
  tool: ToolPack,
  input: {
    ctx: RequestContext;
    canonical: ReturnType<typeof buildCanonical>;
    requestBody: Buffer;
    upstream: { status: number; latencyMs: number; headers: Record<string, string>; body: Buffer };
  },
): Promise<ToolAfterRequestMeta> {
  if (!tool.afterRequest) {
    return {};
  }
  try {
    return (await tool.afterRequest(input)) ?? {};
  } catch {
    return {};
  }
}

async function executeUpstreamWithToolMeta(
  tool: ToolPack,
  ctx: RequestContext,
  canonical: ReturnType<typeof buildCanonical>,
  body: Buffer,
  req: Parameters<typeof proxyUpstream>[0],
  reply: Parameters<typeof proxyUpstream>[1],
  upstreamUrl: string,
): Promise<{ upstream: Awaited<ReturnType<typeof proxyUpstream>>; meta: ToolAfterRequestMeta }> {
  const upstream = await proxyUpstream(req, reply, body, upstreamUrl);
  const meta = await runAfterRequest(tool, {
    ctx,
    canonical,
    requestBody: body,
    upstream: {
      status: upstream.status,
      latencyMs: upstream.latencyMs,
      headers: upstream.headers,
      body: upstream.body,
    },
  });
  return { upstream, meta };
}

function resolveUpstreamUrl(
  tool: ToolPack,
  ctx: RequestContext,
  body: Buffer,
  req: FastifyRequest,
): string {
  const toolUpstream = tool.resolveUpstream?.(ctx, body);
  const headerUpstream = typeof req.headers[INTERNAL_HEADERS.UPSTREAM_URL] === "string"
    ? (req.headers[INTERNAL_HEADERS.UPSTREAM_URL] as string)
    : undefined;

  if (toolUpstream) {
    if (headerUpstream && headerUpstream !== toolUpstream) {
      throw new ACPError(
        "upstream_not_allowed",
        "x-acp-upstream-url does not match tool upstream",
        403,
        { expected: toolUpstream },
      );
    }
    return toolUpstream;
  }

  if (headerUpstream) {
    return headerUpstream;
  }

  throw new ACPError("missing_upstream", "X-ACP-Upstream-Url header is required", 400);
}

async function persistCostEvent(
  db: ACPDatabase | undefined,
  requestId: string,
  meta: ToolAfterRequestMeta,
  upstream: { status: number; latencyMs: number },
): Promise<void> {
  if (!db) {
    return;
  }
  if (!meta.cost && !meta.metadata) {
    return;
  }
  try {
    await db.insertCostEvent({
      requestId,
      ts: new Date(),
      cost: meta.cost,
      reason: meta.reason,
      metadata: meta.metadata,
      upstreamStatus: upstream.status,
      latencyMs: upstream.latencyMs,
    });
  } catch {
    return;
  }
}

async function persistRequestRecord(
  db: ACPDatabase | undefined,
  requestId: string,
  canonical: ReturnType<typeof buildCanonical>,
): Promise<void> {
  if (!db) {
    return;
  }
  try {
    await db.insertRequestRecord({
      id: requestId,
      ts: new Date(),
      principalKey: toStablePrincipalKey(canonical.principal),
      principal: canonical.principal,
      channel: canonical.channel,
      request: canonical.request,
      target: canonical.target,
      metadata: canonical.meta as Record<string, unknown> | undefined,
    });
  } catch {
    return;
  }
}

async function persistAuditEvent(db: ACPDatabase | undefined, event: AuditEvent, requestId: string): Promise<void> {
  if (!db) {
    return;
  }
  try {
    await db.insertAuditEvent(event, requestId);
  } catch {
    return;
  }
}

async function writeAudit(
  db: ACPDatabase | undefined,
  sinks: AuditSink[],
  event: AuditEvent,
  requestId: string,
): Promise<void> {
  await emitAudit(sinks, event);
  await persistAuditEvent(db, event, requestId);
}
