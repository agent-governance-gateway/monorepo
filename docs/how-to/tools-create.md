# How to create a tool pack

Goal: add a tool that classifies requests for routing and approval binding.

## Step 1: Create file

`tools/my-saas.ts`

```ts
/// <reference types="@acp/config/globals" />

export default defineTool({
  id: "my-saas",
  // Optional: omit match and select with x-acp-tool-id: my-saas
  match: (ctx) => ctx.host.endsWith("my-saas.com"),
  resolveUpstream: (ctx) => `https://api.my-saas.com${ctx.path}`,
  normalize: (ctx) => ({
    tool: "my-saas",
    action: ctx.path.includes("/v1/items") ? "items.write" : "unknown",
    resource: ctx.host,
    approvalBind: `my-saas:${ctx.method}:${ctx.path}`,
  }),
});
```

If you omit `match`, call gateway with:

```http
x-acp-tool-id: my-saas
```

## Step 2: Ensure tool discovery is configured

```ts
tools: { dir: "./tools" }
```

## Step 3: Add routing rule

```ts
{ match: { tool: "my-saas", action: "items.write", env: "prod" }, action: { type: "requireApproval", handler: "manual" } }
```

## Request examples

Allowed request:

```bash
curl -i -X GET http://localhost:3100/v1/items \
  -H 'host: api.my-saas.com'
```

Approval-required request (if rule configured):

```bash
curl -i -X POST http://localhost:3100/v1/items \
  -H 'host: api.my-saas.com' \
  -H 'x-api-key: demo-prod-agent-key' \
  -H 'content-type: application/json' \
  -d '{"name":"item"}'
```

## Next steps

- [Plugin interface reference](../reference/plugins.md#toolpack)
- [Cookbook recipes](../recipes/cookbook.md)
