import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import type { ACPConfig } from "@acp/core";
import { createGateway, __testing } from "../src/index.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length) {
    const next = cleanups.pop();
    if (next) {
      await next();
    }
  }
});

async function makeTempPlugins(structure: Record<string, string>): Promise<string> {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "acp-gw-test-"));
  for (const [rel, content] of Object.entries(structure)) {
    const abs = path.join(base, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf8");
  }
  cleanups.push(async () => fs.rm(base, { recursive: true, force: true }));
  return base;
}

async function startUpstream(): Promise<{ url: string; close: () => Promise<void> }> {
  const app = Fastify({ logger: false });
  app.all("/*", async () => ({ ok: true }));
  await app.listen({ port: 0, host: "127.0.0.1" });
  const addr = app.server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("failed to start upstream");
  }
  return { url: `http://127.0.0.1:${addr.port}/echo`, close: () => app.close() };
}

function baseConfig(port: number): ACPConfig {
  return {
    gateway: { port },
    tools: { dir: "./tools" },
    principals: { dir: "./principals" },
    approvals: { dir: "./approvals" },
    sinks: { dir: "./sinks" },
    routing: {
      defaultAction: { type: "passThrough" },
      rules: [
        { match: { method: "POST", env: "prod" }, action: { type: "requireApproval", handler: "noop" } },
      ],
    },
    audit: { sinks: ["file"] },
    opa: { enabled: false, url: "http://127.0.0.1:1" },
    otel: { enabled: false, otlpEndpoint: "http://127.0.0.1:4318" },
    approvalsRuntime: undefined,
    telemetry: undefined,
  };
}

describe("gateway", () => {
  it("routing precedence: first match wins", () => {
    const action = __testing.pickRouteAction(
      {
        gateway: { port: 1 },
        routing: {
          defaultAction: { type: "passThrough" },
          rules: [
            { match: { method: "POST" }, action: { type: "deny", reason: "first" } },
            { match: { method: "POST" }, action: { type: "passThrough" } },
          ],
        },
      } as ACPConfig,
      { channel: "http", method: "POST", host: "a", path: "/x", headers: {} },
      {},
      {},
    );
    expect(action).toEqual({ type: "deny", reason: "first" });
  });

  it("approval lifecycle and second consume rejection", async () => {
    const pluginsDir = await makeTempPlugins({
      "tools/default.ts": "export default defineTool({id:'t',match:()=>true,normalize:(ctx)=>({tool:'t',approvalBind:`b:${ctx.method}:${ctx.path}`})});",
      "principals/default.ts": "export default definePrincipalResolver({id:'p',resolve:()=>({env:'prod',agentId:'a1',tenantId:'t1'})});",
      "approvals/noop.ts": "export default defineApprovalHandler({id:'noop',request:async()=>{}});",
      "sinks/file.ts": "import fs from 'node:fs'; export default defineSink({id:'file',write:async(e)=>{fs.appendFileSync(process.env.ACP_TEST_AUDIT_FILE!, JSON.stringify(e)+'\\n')}});",
    });

    const upstream = await startUpstream();
    cleanups.push(upstream.close);

    const auditFile = path.join(pluginsDir, "audit.log");
    process.env.ACP_TEST_AUDIT_FILE = auditFile;

    const gw = await createGateway(baseConfig(0), { cwd: pluginsDir });
    await gw.app.listen({ port: 0, host: "127.0.0.1" });
    const addr = gw.app.server.address();
    if (!addr || typeof addr === "string") throw new Error("no addr");
    const base = `http://127.0.0.1:${addr.port}`;
    cleanups.push(async () => gw.stop());

    const first = await fetch(`${base}/invoke`, {
      method: "POST",
      headers: { "x-acp-upstream-url": upstream.url, "content-type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
    expect(first.status).toBe(202);
    const approval = (await first.json()) as { approval_task_id: string };

    await fetch(`${base}/approvals/${approval.approval_task_id}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved", decidedBy: "test" }),
    });

    const second = await fetch(`${base}/invoke`, {
      method: "POST",
      headers: {
        "x-acp-upstream-url": upstream.url,
        "x-acp-approval-task-id": approval.approval_task_id,
        "x-idempotency-key": "k1",
      },
      body: JSON.stringify({ a: 1 }),
    });
    expect(second.status).toBe(200);

    const third = await fetch(`${base}/invoke`, {
      method: "POST",
      headers: {
        "x-acp-upstream-url": upstream.url,
        "x-acp-approval-task-id": approval.approval_task_id,
        "x-idempotency-key": "k2",
      },
      body: JSON.stringify({ a: 1 }),
    });
    expect(third.status).toBe(409);
    const t = await third.json();
    expect(t.error).toBe("already_consumed");

    const lines = (await fs.readFile(auditFile, "utf8")).trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it("approval binding mismatch rejects retry", async () => {
    const pluginsDir = await makeTempPlugins({
      "tools/default.ts": "export default defineTool({id:'t',match:()=>true,normalize:(ctx)=>({tool:'t',approvalBind:`b:${ctx.method}:${ctx.path}`})});",
      "principals/default.ts": "export default definePrincipalResolver({id:'p',resolve:()=>({env:'prod',agentId:'a1',tenantId:'t1'})});",
      "approvals/noop.ts": "export default defineApprovalHandler({id:'noop',request:async()=>{}});",
      "sinks/file.ts": "export default defineSink({id:'file',write:async()=>{}});",
    });
    const upstream = await startUpstream();
    cleanups.push(upstream.close);

    const gw = await createGateway(baseConfig(0), { cwd: pluginsDir });
    await gw.app.listen({ port: 0, host: "127.0.0.1" });
    const addr = gw.app.server.address();
    if (!addr || typeof addr === "string") throw new Error("no addr");
    const base = `http://127.0.0.1:${addr.port}`;
    cleanups.push(async () => gw.stop());

    const first = await fetch(`${base}/invoke`, {
      method: "POST",
      headers: { "x-acp-upstream-url": upstream.url },
      body: "ok",
    });
    const approval = (await first.json()) as { approval_task_id: string };

    await fetch(`${base}/approvals/${approval.approval_task_id}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });

    const retry = await fetch(`${base}/other-path`, {
      method: "POST",
      headers: {
        "x-acp-upstream-url": upstream.url,
        "x-acp-approval-task-id": approval.approval_task_id,
      },
      body: "ok",
    });
    expect(retry.status).toBe(409);
    const json = await retry.json();
    expect(json.error).toBe("binding_mismatch");
  });

  it("principal resolver merge later wins", async () => {
    const result = await __testing.resolvePrincipal(
      [
        { id: "a", resolve: () => ({ env: "dev", agentId: "a" }) },
        { id: "b", resolve: () => ({ env: "prod" }) },
      ],
      { channel: "http", method: "GET", host: "x", path: "/", headers: {} },
    );
    expect(result.env).toBe("prod");
    expect(result.agentId).toBe("a");
  });
});
