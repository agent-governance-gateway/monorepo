# Tools

Tools map raw HTTP requests into canonical target fields:
- `tool`
- `action`
- `resource`
- `approvalBind` (optional)

Routing and approvals use these fields.

## How tool selection works

1. Gateway picks the first tool where `match(ctx)` is `true`.
2. Calls `normalize(ctx, body)`.
3. If no custom tool matches, built-in `generic-http` handles request.

## Tool shape

```ts
export default defineTool({
  id: "my-tool",
  match: (ctx) => ctx.host.endsWith("example.com"),
  normalize: (ctx) => ({
    tool: "example",
    action: "create",
    resource: ctx.host,
    approvalBind: `example:${ctx.method}:${ctx.path}`,
  }),
  afterRequest: ({ upstream, canonical }) => ({
    cost: { amount: 0.0012, currency: "USD" },
    reason: "vendor_pricing",
    metadata: {
      provider: "example",
      status: upstream.status,
      tool: canonical.target.tool,
    },
  }),
});
```

## Real examples

### Slack

`apps/example-basic/tools/slack.ts`

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

### OpenAI (with cost metadata)

`apps/example-basic/tools/openai.ts` uses `afterRequest` to parse usage fields and report cost.

Output shape from `afterRequest` is generic:
- `cost`: numeric amount + currency
- `reason`: free-form attribution reason
- `metadata`: user-defined key/value fields

Gateway includes this data in executed audit event and persists it to DB when `store.type=postgres`.

## Redaction and safety

- Gateway already redacts sensitive headers in canonical metadata.
- Request body is not logged by default.
- Keep `approvalBind` stable and deterministic (no nonces/timestamps).
