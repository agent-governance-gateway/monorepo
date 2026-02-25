# OPA Contract Reference

## Gateway -> OPA request

When route action is `enforcePolicy`, gateway sends:

```json
{ "input": <CanonicalAction> }
```

HTTP method: `POST`

Content-Type: `application/json`

## OPA -> Gateway response

Gateway expects:

```json
{ "result": { "decision": "allow" | "deny" | "require_approval", "reason": "optional" } }
```

If OPA HTTP status is non-2xx, gateway treats decision as deny with reason `opa_http_<status>`.

If response is invalid, gateway treats decision as deny with reason `opa_invalid_response`.

## Decision mapping

- `allow` -> `passThrough`
- `deny` -> `deny`
- `require_approval` -> `requireApproval` (handler `noop`, ttl 15m)

## Next steps

- [Enable OPA how-to](../how-to/opa-enable.md)
- [Configuration reference](./configuration.md)
