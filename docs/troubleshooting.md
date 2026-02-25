# Troubleshooting

## `missing_upstream`

Symptom:

```json
{ "error": "missing_upstream" }
```

Fix: include header:

```http
x-acp-upstream-url: https://target.example/path
```

## `approval_not_found`

Symptom: retry with unknown/expired task id returns 404.

Fix:
- verify task id from `approval_required` response,
- poll `GET /approvals/:id` before retry.

## `not_approved`

Symptom: retry before decision.

Fix:
- approve via `POST /approvals/:id/decision`,
- or wait until polling returns `approved`.

## `already_consumed`

Symptom: same task retried after successful execution.

Fix: create new approval flow; do not reuse consumed task IDs.

## `binding_mismatch`

Symptom: task approved, but retry fails with mismatch.

Fix:
- keep principal headers unchanged (`x-tenant-id`, `x-env`, `x-agent-id` etc.),
- keep same method/path/host target,
- keep same normalized binding inputs.

## Approval stuck in `pending`

Checklist:
1. Was manual decision sent to `/approvals/:id/decision`?
2. If using external approver integration, is webhook URL reachable?
3. Does approver principal match the task principal (otherwise `403 forbidden`)?

## 403 denied

Symptom:

```json
{ "error": "denied", "reason": "..." }
```

Fix:
- inspect routing rules order,
- confirm principal fields and tool normalization result.

## DB connection failures

If using Postgres approvals store:
- ensure `STORE_URL` is set and reachable,
- ensure schema/migrations are applied.

## Health check

Gateway health endpoint:

```bash
curl -s http://localhost:3100/healthz
```
