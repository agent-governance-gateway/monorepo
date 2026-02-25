# Tools

Tools map raw HTTP requests into canonical target fields:
- `tool`
- `action`
- `resource`
- `approvalBind` (optional)

Routing and approvals use these fields.

## How tool selection works

1. Gateway picks the first tool where `match(ctx)` is `true`.
2. Resolves upstream:
  - if tool defines `resolveUpstream`, gateway uses it
  - if request also sends `x-acp-upstream-url` and it differs, gateway returns `403 upstream_not_allowed`
3. Calls `normalize(ctx, body)`.
4. If no custom tool matches, built-in `generic-http` handles request.

Built-in tools include:
- `generic-mcp` (for `channel: "mcp"`)
- `openai-like`
- `generic-http`

## Tool shape

```ts
export default defineTool({
  id: "my-tool",
  match: (ctx) => ctx.host.endsWith("example.com"),
  resolveUpstream: (ctx) => `https://api.example.com${ctx.path}`,
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

`resolveUpstream` is the recommended secure default for production tool packs.

## Real examples

### Slack

`apps/example-basic/tools/slack.ts`

```ts
/// <reference types="@acp/config/globals" />

export default defineTool({
  id: "slack",
  match: (ctx) => ctx.host.endsWith("slack.com"),
  resolveUpstream: (ctx) => `https://slack.com${ctx.path}`,
  normalize: (ctx) => ({
    tool: "slack",
    action: ctx.path.includes("chat.postMessage") ? "chat.postMessage" : "unknown",
    resource: ctx.host,
    approvalBind: `slack:${ctx.method}:${ctx.path}`,
  }),
});
```

### OpenAI (with cost metadata)

`apps/example-basic/tools/openai.ts` uses:
- `resolveUpstream: (ctx) => https://api.openai.com${ctx.path}`
- `afterRequest` to parse usage fields and report cost.

Output shape from `afterRequest` is generic:
- `cost`: numeric amount + currency
- `reason`: free-form attribution reason
- `metadata`: user-defined key/value fields

Gateway includes this data in executed audit event and persists it to DB when `store.type=postgres`.

## Integration examples (Before vs After ACP)

### Slack

Before ACP (direct call to Slack API):

```bash
curl -i -X POST https://slack.com/api/chat.postMessage \
  -H 'authorization: Bearer xoxb-***' \
  -H 'content-type: application/json' \
  -d '{"channel":"C123456","text":"hello"}'
```

After ACP (call Gateway, Gateway routes to Slack via tool `resolveUpstream`):

```bash
curl -i -X POST http://localhost:3100/api/chat.postMessage \
  -H 'host: slack.com' \
  -H 'authorization: Bearer xoxb-***' \
  -H 'content-type: application/json' \
  -H 'x-env: prod' \
  -H 'x-tenant-id: tenant-a' \
  -H 'x-agent-id: agent-slack-bot' \
  -d '{"channel":"C123456","text":"hello"}'
```

### OpenAI

Before ACP (direct call to OpenAI API):

```bash
curl -i -X POST https://api.openai.com/v1/chat/completions \
  -H 'authorization: Bearer sk-***' \
  -H 'content-type: application/json' \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hello"}]}'
```

After ACP (call Gateway, Gateway routes to OpenAI via tool `resolveUpstream`):

```bash
curl -i -X POST http://localhost:3100/v1/chat/completions \
  -H 'host: api.openai.com' \
  -H 'authorization: Bearer sk-***' \
  -H 'content-type: application/json' \
  -H 'x-env: prod' \
  -H 'x-tenant-id: tenant-a' \
  -H 'x-agent-id: agent-openai-bot' \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hello"}]}'
```

If routing requires approval in `prod`, first response is `202 approval_required`. Then:
1. Approve: `POST /approvals/:id/decision`
2. Retry same request with `x-acp-approval-task-id`

### Minimal TypeScript client pattern (after ACP)

```ts
const res = await fetch("http://localhost:3100/v1/chat/completions", {
  method: "POST",
  headers: {
    host: "api.openai.com",
    authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    "content-type": "application/json",
    "x-env": "prod",
    "x-tenant-id": "tenant-a",
    "x-agent-id": "agent-openai-bot",
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "hello" }],
  }),
});
```

## Redaction and safety

- Gateway already redacts sensitive headers in canonical metadata.
- Request body is not logged by default.
- Keep `approvalBind` stable and deterministic (no nonces/timestamps).
