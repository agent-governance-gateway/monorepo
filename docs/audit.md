# Audit

Gateway emits audit events for request lifecycle.

## Event kinds

- `request`
- `approval_required`
- `approval_decided`
- `executed`
- `error`

## Where events go

1. Audit sinks (`sinks/*.ts` and built-in `stdout-json`)
2. Postgres table `acp_audit_events` when `store.type=postgres`

Default sink selection:
- if `audit.sinks` is set: use those ids
- otherwise gateway tries `stdout` and `stdout-json` (whichever exist)

In the example app:
- `sinks/stdout.ts` exists, so you see structured logs in stdout.

## Request attribution

When Postgres store is enabled, Gateway writes:
- `acp_requests` (principal + request/target dimensions)
- `acp_audit_events` (linked by `request_id`)
- `acp_approval_tasks` (linked by `request_id`)
- `acp_cost_events` (linked by `request_id`)

Use `acp_requests` as the attribution source and join by `request_id`.

## Example event

```json
{
  "ts": "2026-01-01T00:00:00.000Z",
  "kind": "executed",
  "canonical": {
    "principal": { "tenantId": "tenant-a", "env": "prod", "agentId": "agent-demo" },
    "channel": "http",
    "request": { "method": "POST", "host": "localhost", "path": "/invoke", "bodySize": 18 },
    "target": { "tool": "openai", "action": "chat.completions", "resource": "api.openai.com" }
  },
  "outcome": {
    "status": "executed",
    "upstreamStatus": 200,
    "latencyMs": 120,
    "cost": { "amount": 0.0011, "currency": "USD" },
    "costReason": "token_pricing",
    "metadata": { "model": "gpt-4o-mini", "totalTokens": 320 }
  }
}
```

## Security defaults

- Sensitive headers are redacted (`authorization`, `cookie`, `set-cookie`, etc.).
- Body content is not logged by default (only metadata like body size).
