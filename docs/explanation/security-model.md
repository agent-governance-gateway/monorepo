# Security Model

## What ACP protects

- Unauthorized or risky actions reaching upstreams.
- Replay/misuse of approval tokens across different requests.
- Leakage of sensitive headers in audit metadata.

## Approval binding

Approval retries are bound to:
- `principalKey`
- request `method`
- request `host`
- request `path`
- optional `approvalBind`

No body hashing is used by default.

## Upstream target protection

Tools can pin upstream using `resolveUpstream`.
If a request sends `x-acp-upstream-url` that differs from tool upstream, gateway returns `403 upstream_not_allowed`.

## Redaction defaults

Sensitive headers are redacted in canonical metadata:
- authorization
- cookie
- set-cookie
- proxy-authorization
- x-api-key
- x-auth-token

Request body is not logged by default.

## Recommended rollout

1. Audit-only (`passThrough` + no blocking rules).
2. Block destructive methods (DELETE).
3. Add approvals for prod writes.
4. Add OPA for centralized policy decisions.

## Next steps

- [Cookbook rollout recipe](../recipes/cookbook.md)
- [Troubleshooting](../troubleshooting.md)
