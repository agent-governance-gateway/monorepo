# How to resolve principals from headers

Use this when clients send agent identity in headers.

## Resolver

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "headers",
  resolve: (ctx) => ({
    agentId: typeof ctx.headers["x-agent-id"] === "string" ? ctx.headers["x-agent-id"] : undefined,
    tenantId: typeof ctx.headers["x-tenant-id"] === "string" ? ctx.headers["x-tenant-id"] : undefined,
    env: typeof ctx.headers["x-env"] === "string" ? ctx.headers["x-env"] : "dev",
    workflowId: typeof ctx.headers["x-workflow-id"] === "string" ? ctx.headers["x-workflow-id"] : undefined,
    executionId: typeof ctx.headers["x-execution-id"] === "string" ? ctx.headers["x-execution-id"] : undefined,
    runId: typeof ctx.headers["x-run-id"] === "string" ? ctx.headers["x-run-id"] : undefined,
  }),
});
```

## Request with principal headers

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'x-acp-tool-id: demo-httpbin' \
  -H 'x-agent-id: agent-a' \
  -H 'x-tenant-id: tenant-a' \
  -H 'x-env: prod' \
  -H 'x-workflow-id: wf-01' \
  -H 'x-execution-id: exec-01' \
  -H 'x-run-id: run-01' \
  -H 'content-type: application/json' \
  -d '{}'
```

Expected: `200` or `202` depending on routing rules.

## No principal provided behavior

If resolvers return no fields, principal is `{}`. Routing rules that depend on principal fields will not match.

## Audit snippet

```json
{
  "kind": "request",
  "canonical": {
    "principal": {
      "agentId": "agent-a",
      "tenantId": "tenant-a",
      "env": "prod",
      "workflowId": "wf-01",
      "executionId": "exec-01",
      "runId": "run-01"
    }
  }
}
```

## Next steps

- [Domain-based principals](./principals-domain.md)
- [Plugins reference](../reference/plugins.md#principalresolver)
