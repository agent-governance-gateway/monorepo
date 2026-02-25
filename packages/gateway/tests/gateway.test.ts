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
    store: { type: "memory" },
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
    telemetry: undefined,
  };
}

describe("gateway", () => {
  it("routing precedence: first match wins", () => {
    const action = __testing.pickRouteAction(
      {
        gateway: { port: 1 },
        store: { type: "memory" },
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

  it("routes /mcp requests with channel=mcp", async () => {
    const pluginsDir = await makeTempPlugins({
      "tools/default.ts": "export default defineTool({id:'t',match:()=>true,normalize:()=>({tool:'t',action:'x',resource:'r'})});",
      "principals/default.ts": "export default definePrincipalResolver({id:'p',resolve:()=>({env:'dev',agentId:'a1',tenantId:'t1'})});",
      "approvals/noop.ts": "export default defineApprovalHandler({id:'noop',request:async()=>{}});",
      "sinks/file.ts": "export default defineSink({id:'file',write:async()=>{}});",
    });

    const upstream = await startUpstream();
    cleanups.push(upstream.close);

    const cfg = baseConfig(0);
    cfg.routing.rules = [{ match: { channel: "mcp" }, action: { type: "deny", reason: "mcp_disabled" } }];
    const gw = await createGateway(cfg, { cwd: pluginsDir });
    await gw.app.listen({ port: 0, host: "127.0.0.1" });
    const addr = gw.app.server.address();
    if (!addr || typeof addr === "string") throw new Error("no addr");
    const base = `http://127.0.0.1:${addr.port}`;
    cleanups.push(async () => gw.stop());

    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "x-acp-upstream-url": upstream.url,
        "content-type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: "1", method: "tools/call", params: {} }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("denied");
    expect(body.reason).toBe("mcp_disabled");
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

  it("captures tool afterRequest cost metadata in executed audit", async () => {
    const pluginsDir = await makeTempPlugins({
      "tools/cost.ts": `
        export default defineTool({
          id:'cost',
          match:()=>true,
          normalize:(ctx)=>({tool:'cost',action:'run',resource:ctx.host,approvalBind:\`b:\${ctx.method}:\${ctx.path}\`}),
          afterRequest:()=>({
            cost:{amount:0.1234,currency:'USD'},
            reason:'token_pricing',
            metadata:{tokens:42,provider:'test'}
          }),
        });
      `,
      "principals/default.ts": "export default definePrincipalResolver({id:'p',resolve:()=>({env:'dev',agentId:'a1',tenantId:'t1'})});",
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

    const res = await fetch(`${base}/invoke`, {
      method: "GET",
      headers: { "x-acp-upstream-url": upstream.url },
    });
    expect(res.status).toBe(200);

    const lines = (await fs.readFile(auditFile, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    const executed = lines.find((event) => event.kind === "executed");
    expect(executed).toBeTruthy();
    expect(executed.outcome.cost.amount).toBe(0.1234);
    expect(executed.outcome.costReason).toBe("token_pricing");
    expect(executed.outcome.metadata.tokens).toBe(42);
  });

  it("selects tool by x-acp-tool-id when tool has no match", async () => {
    const upstream = await startUpstream();
    cleanups.push(upstream.close);

    const pluginsDir = await makeTempPlugins({
      "tools/id-only.ts": `
        export default defineTool({
          id:'id-only',
          resolveUpstream:()=> '${upstream.url}',
          normalize:()=>({tool:'id-only',action:'run',resource:'demo'}),
        });
      `,
      "principals/default.ts": "export default definePrincipalResolver({id:'p',resolve:()=>({env:'dev',agentId:'a1',tenantId:'t1'})});",
      "approvals/noop.ts": "export default defineApprovalHandler({id:'noop',request:async()=>{}});",
      "sinks/file.ts": "export default defineSink({id:'file',write:async()=>{}});",
    });

    const gw = await createGateway(baseConfig(0), { cwd: pluginsDir });
    await gw.app.listen({ port: 0, host: "127.0.0.1" });
    const addr = gw.app.server.address();
    if (!addr || typeof addr === "string") throw new Error("no addr");
    const base = `http://127.0.0.1:${addr.port}`;
    cleanups.push(async () => gw.stop());

    const withoutId = await fetch(`${base}/invoke`, { method: "GET" });
    expect(withoutId.status).toBe(400);

    const withId = await fetch(`${base}/invoke`, {
      method: "GET",
      headers: { "x-acp-tool-id": "id-only" },
    });
    expect(withId.status).toBe(200);
  });

  it("rejects request when tool upstream and header upstream mismatch", async () => {
    const pluginsDir = await makeTempPlugins({
      "tools/locked.ts": `
        export default defineTool({
          id:'locked',
          match:()=>true,
          resolveUpstream:()=> 'https://example.com/fixed',
          normalize:(ctx)=>({tool:'locked',action:'run',resource:ctx.host}),
        });
      `,
      "principals/default.ts": "export default definePrincipalResolver({id:'p',resolve:()=>({env:'dev',agentId:'a1',tenantId:'t1'})});",
      "approvals/noop.ts": "export default defineApprovalHandler({id:'noop',request:async()=>{}});",
      "sinks/file.ts": "export default defineSink({id:'file',write:async()=>{}});",
    });

    const gw = await createGateway(baseConfig(0), { cwd: pluginsDir });
    await gw.app.listen({ port: 0, host: "127.0.0.1" });
    const addr = gw.app.server.address();
    if (!addr || typeof addr === "string") throw new Error("no addr");
    const base = `http://127.0.0.1:${addr.port}`;
    cleanups.push(async () => gw.stop());

    const res = await fetch(`${base}/invoke`, {
      method: "GET",
      headers: { "x-acp-upstream-url": "https://evil.example/not-allowed" },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("upstream_not_allowed");
  });
});
