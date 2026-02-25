# Tools

Tools convert raw HTTP requests into canonical target fields used by routing, approvals, and audit.

## How matching works

Gateway calls `chooseTool()`:
1. First tool with `match(ctx) === true` is selected.
2. `normalize(ctx, body)` creates `tool/action/resource/approvalBind`.
3. If nothing matches, built-in `generic-http` fallback is used.

## Built-in tools

From `@acp/tools`:
- `openai-like`
- `generic-http`

## Tool interface

```ts
export default defineTool({
  id: "example",
  match: (ctx) => boolean,
  normalize: (ctx, body) => ({
    tool: "example",
    action: "operation",
    resource: ctx.host,
    approvalBind: `example:${ctx.method}:${ctx.path}`,
  }),
});
```

## Example: Slack-like tool

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

## Example: OpenAI-like tool

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

## Redaction in tools

`ToolPack` supports optional redaction hooks:

```ts
redact: {
  headers: (headers) => ({ ...headers, authorization: "***REDACTED***" }),
  body: (body) => null,
}
```

> NOTE
> Current gateway canonical metadata already redacts common sensitive headers globally.
> Request body is not logged by default.

## Tool design tips

- Keep `approvalBind` stable (no nonce/token).
- Keep `action` small and deterministic.
- Use `resource` for policy/routing granularity (e.g., host or entity path).
