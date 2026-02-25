# How to enable OPA policy checks

Use OPA when static routing rules are not enough.

## Config

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "POST" }, action: { type: "enforcePolicy" } },
  ],
},
opa: {
  enabled: true,
  url: "http://localhost:8181/v1/data/acp/decision",
},
```

## Minimal Rego policy

```rego
package acp

default result = {"decision": "deny", "reason": "default_deny"}

result = {"decision": "allow"} {
  input.request.method == "GET"
}

result = {"decision": "require_approval", "reason": "prod_write"} {
  input.request.method == "POST"
  input.principal.env == "prod"
}
```

## Request examples

Allowed request:

```bash
curl -i -X GET http://localhost:3100/get \
  -H 'x-acp-tool-id: demo-httpbin' \
  -H 'x-api-key: demo-dev-agent-key'
```

Expected: `200` if OPA returns `allow`.

Approval-required request:

```bash
curl -i -X POST http://localhost:3100/post \
  -H 'x-acp-tool-id: demo-httpbin' \
  -H 'x-api-key: demo-prod-agent-key' \
  -H 'content-type: application/json' \
  -d '{"hello":"world"}'
```

Expected: `202` if OPA returns `require_approval`.

## Next steps

- [OPA contract reference](../reference/opa-contract.md)
- [Architecture explanation](../explanation/architecture.md)
