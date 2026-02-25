# Security Model

This page explains what ACP enforces and where responsibility remains with your application.

## What ACP protects

- Unauthorized or risky actions reaching upstreams.
- Replay/misuse of approval tokens across different requests.
- Leakage of sensitive headers in audit metadata.

## Shared responsibility

ACP enforces request-time controls.
You still need:
- upstream credential security,
- network-level access controls,
- identity proofing for resolver inputs (for example API key validation).

## Approval binding

Approval retries are bound to:
- `principalKey`
- request `method`
- request `host`
- request `path`
- optional `approvalBind`

No body hashing is used by default.

Why no body hashing by default:
- avoids brittle failures due to JSON serialization differences,
- keeps binding stable across safe retries,
- still prevents cross-action misuse through principal + method/host/path binding.

## Upstream target protection

Tools can pin upstream using `resolveUpstream`.
If a request sends `x-acp-upstream-url` that differs from tool upstream, gateway returns `403 upstream_not_allowed`.

Recommendation:
- for production tools, always set `resolveUpstream`.
- treat header upstream as fallback for generic or migration scenarios only.

## Redaction defaults

Sensitive headers are redacted in canonical metadata:
- authorization
- cookie
- set-cookie
- proxy-authorization
- x-api-key
- x-auth-token

Request body is not logged by default.

Practical implication:
- audit events remain useful for investigations without exposing high-risk secrets.

## Recommended rollout

1. Audit-only (`passThrough` + no blocking rules).
2. Block destructive methods (DELETE).
3. Add approvals for prod writes.
4. Add OPA for centralized policy decisions.

## High-risk misconfigurations to avoid

- Allowing anonymous principals for sensitive routes.
- Using wildcard pass-through rules before deny/approval rules.
- Reusing approval task ids across request contexts.
- Trusting caller-provided upstream when a tool should pin destination.

## Next steps

- [Cookbook rollout recipe](../recipes/cookbook.md)
- [Troubleshooting](../troubleshooting.md)
