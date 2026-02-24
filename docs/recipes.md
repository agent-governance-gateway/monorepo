# Recipes

Copy-paste recipes for common production patterns.

## 1) Block all DELETE requests

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "DELETE" }, action: { type: "deny", reason: "delete_blocked" } },
  ],
}
```

## 2) Require approval for prod writes

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    {
      match: { method: "POST", env: "prod" },
      action: { type: "requireApproval", handler: "webhook", ttlMs: 300000 },
    },
    {
      match: { method: "PUT", env: "prod" },
      action: { type: "requireApproval", handler: "webhook", ttlMs: 300000 },
    },
  ],
}
```

## 3) Allow all but deny GitHub repo deletion

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    {
      match: {
        method: "DELETE",
        host: "api.github.com",
        path: /^\/repos\/.+/,
      },
      action: { type: "deny", reason: "github_repo_delete_blocked" },
    },
  ],
}
```

## 4) Tag actions by agent/workflow/run

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "trace-tags",
  resolve: (ctx) => ({
    agentId: typeof ctx.headers["x-agent-id"] === "string" ? ctx.headers["x-agent-id"] : undefined,
    workflowId: typeof ctx.headers["x-workflow-id"] === "string" ? ctx.headers["x-workflow-id"] : undefined,
    runId: typeof ctx.headers["x-run-id"] === "string" ? ctx.headers["x-run-id"] : undefined,
  }),
});
```

## 5) Create a Tool for a new SaaS API

```ts
/// <reference types="@acp/config/globals" />

export default defineTool({
  id: "crm-api",
  match: (ctx) => ctx.host === "api.crm.example.com",
  normalize: (ctx) => ({
    tool: "crm-api",
    action: `${ctx.method}:${ctx.path}`,
    resource: ctx.host,
    approvalBind: `crm:${ctx.method}:${ctx.path}`,
  }),
});
```

## 6) Send audit events to Postgres

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

Enable sink:

```ts
audit: {
  sinks: ["postgres"],
}
```

## 7) Run Gateway behind reverse proxy

```ts
gateway: {
  port: 3100,
  basePath: "/acp",
}
```

Endpoints become prefixed (example `/acp/approvals/:id`).

## 8) Multi-tenant setup (Principal-first)

### Resolver chain

```ts
// principals/01-header.ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "tenant-header",
  resolve: (ctx) => ({
    tenantId: typeof ctx.headers["x-tenant-id"] === "string" ? ctx.headers["x-tenant-id"] : undefined,
    env: typeof ctx.headers["x-env"] === "string" ? ctx.headers["x-env"] : "dev",
    agentId: typeof ctx.headers["x-agent-id"] === "string" ? ctx.headers["x-agent-id"] : undefined,
  }),
});
```

```ts
// principals/99-fallback.ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "fallback",
  resolve: () => ({
    tenantId: "tenant-default",
  }),
});
```

### Rules by tenant/agent

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    {
      match: { env: "prod", agentId: "finance-agent", method: "POST" },
      action: { type: "requireApproval", handler: "webhook" },
    },
    {
      match: { method: "DELETE" },
      action: { type: "deny", reason: "delete_blocked_all_tenants" },
    },
  ],
}
```

## 9) Service-to-service gateway mode

When callers are backend workers, use service IDs in principal.

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "service-id",
  resolve: (ctx) => ({
    serviceId: typeof ctx.headers["x-service-id"] === "string" ? ctx.headers["x-service-id"] : undefined,
    env: typeof ctx.headers["x-env"] === "string" ? ctx.headers["x-env"] : "staging",
  }),
});
```

```ts
rules: [
  { match: { method: "POST", env: "prod" }, action: { type: "requireApproval", handler: "webhook" } },
]
```

## 10) Retry flow from client app (TypeScript)

```ts
const first = await fetch("http://localhost:3100/invoke", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-env": "prod",
    "x-agent-id": "agent-demo",
    "x-tenant-id": "tenant-a",
    "x-acp-upstream-url": "http://localhost:3200/v1/chat/completions",
  },
  body: JSON.stringify({ prompt: "hello" }),
});

const approval = await first.json();

const second = await fetch("http://localhost:3100/invoke", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-env": "prod",
    "x-agent-id": "agent-demo",
    "x-tenant-id": "tenant-a",
    "x-acp-upstream-url": "http://localhost:3200/v1/chat/completions",
    "x-acp-approval-task-id": approval.approval_task_id,
    "x-idempotency-key": "req-1001",
  },
  body: JSON.stringify({ prompt: "hello" }),
});
```
