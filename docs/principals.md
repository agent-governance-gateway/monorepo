# Principals

Principals define who is calling. Gateway uses principal data for:
- routing matches (`agentId`, `env`)
- approval ownership checks (`principalKey`)
- request/audit/cost attribution

Example files:
- `apps/example-basic/principals/01-headers.ts`
- `apps/example-basic/principals/20-domain.ts`
- `apps/example-basic/principals/99-fallback.ts`

## Resolver merge behavior

- Resolvers are loaded in filename order.
- Each resolver returns partial principal fields.
- Later resolvers overwrite earlier values.

Use numeric file prefixes (`01-`, `20-`, `99-`) to control precedence.

## Header-based resolver

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "headers",
  resolve: (ctx) => ({
    env: typeof ctx.headers["x-env"] === "string" ? ctx.headers["x-env"] : "dev",
    tenantId: typeof ctx.headers["x-tenant-id"] === "string" ? ctx.headers["x-tenant-id"] : undefined,
    agentId: typeof ctx.headers["x-agent-id"] === "string" ? ctx.headers["x-agent-id"] : undefined,
    workflowId: typeof ctx.headers["x-workflow-id"] === "string" ? ctx.headers["x-workflow-id"] : undefined,
    executionId: typeof ctx.headers["x-execution-id"] === "string" ? ctx.headers["x-execution-id"] : undefined,
    runId: typeof ctx.headers["x-run-id"] === "string" ? ctx.headers["x-run-id"] : undefined,
  }),
});
```

## API key mapping resolver

```ts
/// <reference types="@acp/config/globals" />

const AGENT_KEYS: Record<string, { tenantId: string; agentId: string; env: string }> = {
  "key-prod-agent-a": { tenantId: "tenant-a", agentId: "agent-a", env: "prod" },
  "key-staging-agent-b": { tenantId: "tenant-b", agentId: "agent-b", env: "staging" },
};

export default definePrincipalResolver({
  id: "api-key-map",
  resolve: (ctx) => {
    const key = typeof ctx.headers["x-api-key"] === "string" ? ctx.headers["x-api-key"] : undefined;
    if (!key) return null;
    return AGENT_KEYS[key] ?? { agentId: "unauthorized" };
  },
});
```

You can then deny unknown keys with routing:

```ts
{ match: { agentId: "unauthorized" }, action: { type: "deny", reason: "invalid_api_key" } }
```

## Domain/subdomain resolver

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "domain-agent",
  resolve: (ctx) => {
    if (!ctx.host.endsWith(".agents.local")) return null;
    return { agentId: ctx.host.replace(".agents.local", "") };
  },
});
```

## Approval ownership

`GET /approvals/:id` and `POST /approvals/:id/decision` also run principal resolution.
Only the same resolved `principalKey` can read/decide a task. Others get `403`.
