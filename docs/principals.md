# Principals

`Principal` is who initiated the action. It powers routing, approvals, and audit context.

## Why Principals matter

Without stable principal fields, safe policy is hard. Example: `requireApproval` for `env=prod` only works if `env` is resolved correctly.

## Resolver interface

Each file in `principals/` exports one resolver:

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "resolver-id",
  resolve: (ctx) => ({ agentId: "..." }),
});
```

## Real-world resolver patterns

### 1) Headers (most common)

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "headers",
  resolve: (ctx) => ({
    tenantId: typeof ctx.headers["x-tenant-id"] === "string" ? ctx.headers["x-tenant-id"] : undefined,
    env: typeof ctx.headers["x-env"] === "string" ? ctx.headers["x-env"] : "dev",
    agentId: typeof ctx.headers["x-agent-id"] === "string" ? ctx.headers["x-agent-id"] : "unknown-agent",
    workflowId: typeof ctx.headers["x-workflow-id"] === "string" ? ctx.headers["x-workflow-id"] : undefined,
    runId: typeof ctx.headers["x-run-id"] === "string" ? ctx.headers["x-run-id"] : undefined,
  }),
});
```

### 2) Subdomain mapping

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "subdomain",
  resolve: (ctx) => {
    if (!ctx.host.endsWith(".agents.internal")) return null;
    const agentId = ctx.host.replace(".agents.internal", "");
    return { agentId };
  },
});
```

### 3) Service identity mapping

```ts
/// <reference types="@acp/config/globals" />

const serviceMap: Record<string, string> = {
  "svc-payments": "payments-worker",
  "svc-risk": "risk-worker",
};

export default definePrincipalResolver({
  id: "service-map",
  resolve: (ctx) => {
    const key = typeof ctx.headers["x-service-id"] === "string" ? ctx.headers["x-service-id"] : undefined;
    return key ? { serviceId: serviceMap[key] ?? key } : null;
  },
});
```

## Merge behavior

- Resolvers run in alphabetical file order.
- Results are merged.
- Later resolver overwrites earlier fields.

Example layout:

```text
principals/
  01-headers.ts
  02-subdomain.ts
  99-manual-override.ts
```

## Routing with principal fields

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { env: "prod", method: "POST" }, action: { type: "requireApproval", handler: "webhook" } },
    { match: { agentId: "dangerous-agent", method: "DELETE" }, action: { type: "deny", reason: "agent_blocked" } },
  ],
}
```

## Troubleshooting principal issues

- Add temporary debug sink and inspect `canonical.principal` in audit events.
- Ensure resolver filenames/order are intentional.
- Keep principal fields stable; avoid random values.
