# OPA Integration

OPA support is built in and optional. Keep it off until you need centralized policy logic.

## When To Enable OPA

Enable OPA when:
- You need policy logic that changes faster than code deploys.
- You need a single policy language across services.
- You need richer deny/approval decisions than static routing rules.

## Gateway Behavior

When route action is `enforcePolicy`, Gateway calls OPA HTTP API with input containing canonical action.

Expected result shape:

```json
{
  "result": {
    "decision": "allow",
    "reason": "optional"
  }
}
```

`decision` can be:
- `allow`
- `deny`
- `require_approval`

## Enable OPA

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "POST" }, action: { type: "enforcePolicy" } },
  ],
},
opa: {
  enabled: true,
  url: "http://opa:8181/v1/data/acp/decision",
},
```

## Example Rego Policy

```rego
package acp

default decision = {"decision": "deny", "reason": "default_deny"}

decision = {"decision": "allow"} {
  input.request.method == "GET"
}

decision = {"decision": "require_approval", "reason": "prod_write"} {
  input.request.method == "POST"
  input.principal.env == "prod"
}

decision = {"decision": "deny", "reason": "delete_blocked"} {
  input.request.method == "DELETE"
}
```

## Local Testing

1. Start OPA with policy.
2. Configure gateway `opa.enabled=true`.
3. Send requests and verify allow/deny/approval outcomes.

Example input test (direct OPA call):

```bash
curl -X POST http://localhost:8181/v1/data/acp/decision \
  -H 'content-type: application/json' \
  -d '{"input":{"principal":{"env":"prod"},"request":{"method":"POST"}}}'
```

## Practical Advice

- Keep routing rules for broad shape control.
- Use OPA for fine-grained policy branching.
- Return clear `reason` values for operator understanding.
