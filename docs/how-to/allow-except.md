# How to allow all except selected patterns

## Config

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "DELETE" }, action: { type: "deny", reason: "delete_is_forbidden" } },
    { match: { tool: "openai", action: "unknown" }, action: { type: "deny", reason: "unsupported_openai_action" } },
    { match: { tool: "slack", action: "unknown" }, action: { type: "deny", reason: "unsupported_slack_action" } },
  ],
},
```

## Allowed request

```bash
curl -i -X POST http://localhost:3100/v1/chat/completions \
  -H 'host: api.openai.com' \
  -H 'x-api-key: demo-dev-agent-key' \
  -H 'content-type: application/json' \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}'
```

Expected: upstream result (typically `200` or provider error).

## Blocked request

```bash
curl -i -X POST http://localhost:3100/v1/not-supported \
  -H 'host: api.openai.com' \
  -H 'x-api-key: demo-dev-agent-key' \
  -H 'content-type: application/json' \
  -d '{}'
```

Expected: `403`

```json
{ "error": "denied", "reason": "unsupported_openai_action" }
```

## Next steps

- [Per-tool rules and tool packs](./tools-create.md)
- [Headers reference](../reference/headers.md)
