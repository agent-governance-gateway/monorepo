# Plugins

ACP discovers plugins automatically from configured directories.

## Auto-Discovery Directories

Configured in `acp.config.ts`:

```ts
tools: { dir: "./tools" },
principals: { dir: "./principals" },
approvals: { dir: "./approvals" },
sinks: { dir: "./sinks" },
```

Each file should export one default plugin (`1 file = 1 plugin`).

## Global `define*` Helpers

Gateway calls `installGlobals()` before importing plugins, so plugin files can use global helpers without imports.

- `defineTool`
- `definePrincipalResolver`
- `defineApprovalHandler`
- `defineSink`

## Principal Resolver Deep Dive

Principal resolvers are the most important extension point for safe routing.

### Merge behavior

- Resolvers are loaded alphabetically by filename.
- Each resolver returns partial principal fields.
- Later resolvers overwrite earlier values.

Example load order:
- `principals/01-base.ts`
- `principals/02-env.ts`
- `principals/99-override.ts`

## Principal Resolver Examples (Real Usage Flows)

### 1) Header principal (internal services)

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "header",
  resolve: (ctx) => ({
    tenantId: typeof ctx.headers["x-tenant-id"] === "string" ? ctx.headers["x-tenant-id"] : undefined,
    env: typeof ctx.headers["x-env"] === "string" ? ctx.headers["x-env"] : "dev",
    agentId: typeof ctx.headers["x-agent-id"] === "string" ? ctx.headers["x-agent-id"] : "unknown-agent",
  }),
});
```

### 2) Runtime trace metadata (workflow/run)

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "workflow-tags",
  resolve: (ctx) => ({
    workflowId: typeof ctx.headers["x-workflow-id"] === "string" ? ctx.headers["x-workflow-id"] : undefined,
    executionId: typeof ctx.headers["x-execution-id"] === "string" ? ctx.headers["x-execution-id"] : undefined,
    runId: typeof ctx.headers["x-run-id"] === "string" ? ctx.headers["x-run-id"] : undefined,
  }),
});
```

### 3) Subdomain tenant resolver (multi-tenant gateway)

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "tenant-from-host",
  resolve: (ctx) => {
    const host = ctx.host.toLowerCase();
    if (!host.endsWith(".agents.internal")) return null;
    const tenantId = host.replace(".agents.internal", "");
    return { tenantId };
  },
});
```

### 4) API-key based service mapping (simple map)

```ts
/// <reference types="@acp/config/globals" />

const apiKeyMap: Record<string, { serviceId: string; env: string }> = {
  "svc-key-1": { serviceId: "billing-worker", env: "prod" },
  "svc-key-2": { serviceId: "support-worker", env: "staging" },
};

export default definePrincipalResolver({
  id: "api-key-map",
  resolve: (ctx) => {
    const key = typeof ctx.headers["x-api-key"] === "string" ? ctx.headers["x-api-key"] : undefined;
    if (!key) return null;
    return apiKeyMap[key] ?? null;
  },
});
```

## Tool Examples

### Tool Example (`tools/slack.ts`)

```ts
/// <reference types="@acp/config/globals" />

export default defineTool({
  id: "slack",
  match: (ctx) => ctx.host.endsWith("slack.com"),
  normalize: (ctx) => ({
    tool: "slack",
    action: ctx.path.includes("chat.postMessage") ? "chat.postMessage" : "unknown",
    resource: ctx.host,
    approvalBind: `slack:${ctx.method}:${ctx.path}`,
  }),
});
```

### Tool Example (`tools/openai.ts`)

```ts
/// <reference types="@acp/config/globals" />

export default defineTool({
  id: "openai",
  match: (ctx) => ctx.path.includes("/v1/") || ctx.host.includes("openai"),
  normalize: (ctx) => ({
    tool: "openai",
    action: ctx.path.includes("chat/completions") ? "chat.completions" : "unknown",
    resource: ctx.host,
    approvalBind: `openai:${ctx.method}:${ctx.host}:${ctx.path}`,
  }),
});
```

## Approval Handler Examples

### Webhook handler (basic)

```ts
/// <reference types="@acp/config/globals" />

export default defineApprovalHandler({
  id: "webhook",
  request: async (payload) => {
    await fetch("http://localhost:3300/approval-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
});
```

### Webhook handler with HMAC signature

```ts
/// <reference types="@acp/config/globals" />
import crypto from "node:crypto";

const SECRET = process.env.APPROVER_SHARED_SECRET ?? "dev-secret";

export default defineApprovalHandler({
  id: "webhook-hmac",
  request: async (payload) => {
    const body = JSON.stringify(payload);
    const signature = crypto.createHmac("sha256", SECRET).update(body).digest("hex");

    await fetch("http://localhost:3300/approval-request", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-acp-signature": signature,
      },
      body,
    });
  },
});
```

## Audit Sink Examples

### stdout (`sinks/stdout.ts`)

```ts
/// <reference types="@acp/config/globals" />

export default defineSink({
  id: "stdout",
  write: async (event) => {
    console.log(JSON.stringify(event));
  },
});
```

### postgres (`sinks/postgres.ts`)

```ts
/// <reference types="@acp/config/globals" />
import { PostgresJsonbSink } from "@acp/audit";

const sink = new PostgresJsonbSink({
  id: "postgres",
  url: "postgres://postgres:postgres@localhost:5432/postgres",
});

await sink.connect();

export default defineSink(sink);
```

## End-to-End Plugin Layout

```text
.
├─ acp.config.ts
├─ tools/
│  ├─ slack.ts
│  └─ openai.ts
├─ principals/
│  ├─ 01-header.ts
│  ├─ 02-workflow.ts
│  └─ 99-tenant.ts
├─ approvals/
│  └─ webhook.ts
└─ sinks/
   ├─ stdout.ts
   └─ postgres.ts
```

## Tips

> **Tip**
> Keep plugin files small. One plugin, one job.

> **Tip**
> For Principals, prefer stable IDs and environment markers over free-form strings.

> **Tip**
> Use stable `approvalBind` strings (no nonce/token/body hash by default).
