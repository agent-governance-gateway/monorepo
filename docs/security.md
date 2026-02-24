# Security

ACP is built to reduce governance risk for agent traffic without forcing heavy complexity.

## Threat Model (Practical)

ACP helps defend against:
- Unintended high-risk actions from agent/tool calls.
- Approval replay/reuse.
- Lack of accountability for who initiated actions.
- Sensitive data leakage through logs.

ACP does not replace:
- Network perimeter security.
- Application-level authz.
- Secrets management systems.

## Secure Defaults

- Sensitive headers are redacted (`Authorization`, `Cookie`, etc.) in canonical metadata used for audit/telemetry.
- Request body is not logged by default.
- Internal `X-ACP-*` headers are stripped from upstream forwarding.
- Approval retry requires binding match and approved state.

## Why Body Is Not Logged by Default

Request bodies often contain:
- Tokens/keys
- User content / PII
- LLM prompt payloads

Logging body by default increases leak risk and storage liability.

## Approval Misuse Prevention

Approval task is tied to stable binding fields:
- principal key
- method/host/path
- optional tool-derived `approvalBind`

This prevents using one approval for a different action.

## Progressive Safe Rollout

Use this rollout sequence in production:

1. Audit only
- `defaultAction: passThrough`
- enable sinks
- observe canonical actions and risk patterns

2. Deny destructive actions
- e.g. deny all `DELETE`

3. Require approvals in prod writes
- e.g. `POST` in `env=prod` uses Approval Task flow

4. Enable OPA for fine-grained policy
- start with non-destructive actions first

## Compliance Notes

Audit events provide a decision trail:
- request received
- approval required / decided
- executed / denied / error

Persist these events in an immutable sink (e.g., Postgres append-only table).

## Recommended Ops Controls

- Restrict access to `/approvals/:id/decision` to trusted approver systems.
- Use signing secret verification for decision calls.
- Run gateway behind TLS termination and auth layers.
- Keep DB credentials out of code and in secret managers.
