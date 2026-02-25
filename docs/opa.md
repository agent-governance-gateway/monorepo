# OPA

OPA integration is built in and disabled by default.

## When to use

Use OPA when static routing rules are not enough and you want centralized policy logic.

## How gateway calls OPA

When route action is `enforcePolicy`, gateway sends:

```json
{ "input": <CanonicalAction> }
```

to configured `opa.url` using HTTP POST.

Gateway expects response body:

```json
{
  "result": {
    "decision": "allow",
    "reason": "optional"
  }
}
```

`decision` values:
- `allow`
- `deny`
- `require_approval`

## Enable in config

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [{ match: { method: "POST" }, action: { type: "enforcePolicy" } }],
},
opa: {
  enabled: true,
  url: "http://opa:8181/v1/data/acp/decision",
}
```

## Rego example

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

## Local test

```bash
curl -X POST http://localhost:8181/v1/data/acp/decision \
  -H 'content-type: application/json' \
  -d '{"input":{"principal":{"env":"prod"},"request":{"method":"POST"}}}'
```

## Result mapping in gateway

- `allow` -> `passThrough`
- `deny` -> `deny`
- `require_approval` -> `requireApproval`
