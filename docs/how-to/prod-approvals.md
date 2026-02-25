# How to require approvals for prod writes

## Config

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "POST", env: "prod" }, action: { type: "requireApproval", handler: "manual", ttlMs: 300000 } },
    { match: { method: "PUT", env: "prod" }, action: { type: "requireApproval", handler: "manual", ttlMs: 300000 } },
    { match: { method: "PATCH", env: "prod" }, action: { type: "requireApproval", handler: "manual", ttlMs: 300000 } },
  ],
},
```

## Allowed (no approval) request

Use a dev principal:

```bash
curl -i -X POST http://localhost:3100/post \
  -H 'x-acp-tool-id: demo-httpbin' \
  -H 'x-api-key: demo-dev-agent-key' \
  -H 'content-type: application/json' \
  -d '{"ok":true}'
```

Expected: `200`.

## Approval-required request

Use a prod principal:

```bash
curl -i -X POST http://localhost:3100/post \
  -H 'x-acp-tool-id: demo-httpbin' \
  -H 'x-api-key: demo-prod-agent-key' \
  -H 'content-type: application/json' \
  -d '{"ok":true}'
```

Expected: `202 approval_required`.

## Next steps

- [Approvals tutorial](../tutorials/approvals-end-to-end.md)
- [Endpoints reference](../reference/endpoints.md)
