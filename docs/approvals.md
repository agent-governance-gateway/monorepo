# Approvals

Approvals are triggered by:
- routing action `requireApproval`
- OPA decision `require_approval`

## Lifecycle

1. Request matches approval rule.
2. Gateway creates task (`pending`) and returns `202 approval_required`.
3. Operator/system decides task via `POST /approvals/:id/decision`.
4. Client retries same request with `x-acp-approval-task-id`.
5. On successful upstream response, task becomes `consumed`.
6. Reusing same task returns `409 already_consumed`.

## Endpoints

- `GET /approvals/:id`
- `POST /approvals/:id/decision`

If `gateway.basePath` is set, endpoints are prefixed.

## Binding rules

Task is bound to:
- `principalKey` (from resolved principal)
- request `method`
- request `host`
- request `path`
- optional `approvalBind` from tool normalization

Body hashing is not used by default.

## Manual flow (curl)

### 1) Trigger approval

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'x-env: prod' \
  -H 'x-agent-id: agent-demo' \
  -H 'x-tenant-id: tenant-a' \
  -H 'x-acp-upstream-url: https://httpbin.org/post' \
  -H 'content-type: application/json' \
  -d '{"prompt":"hello"}'
```

Expected `202`:

```json
{
  "status": "approval_required",
  "approval_task_id": "<id>",
  "poll_url": "/approvals/<id>",
  "reason": "route requires approval"
}
```

### 2) Decide task

```bash
curl -i -X POST http://localhost:3100/approvals/<id>/decision \
  -H 'content-type: application/json' \
  -d '{"status":"approved","decidedBy":"ops","reason":"ok"}'
```

### 3) Retry with approval id

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'x-env: prod' \
  -H 'x-agent-id: agent-demo' \
  -H 'x-tenant-id: tenant-a' \
  -H 'x-acp-upstream-url: https://httpbin.org/post' \
  -H 'x-acp-approval-task-id: <id>' \
  -H 'x-idempotency-key: retry-001' \
  -H 'content-type: application/json' \
  -d '{"prompt":"hello"}'
```

### 4) Retry again (must fail)

```json
{ "error": "already_consumed", "message": "approval task already consumed" }
```

## Principal-based authorization

Approval read/decision endpoints use principal resolution too.
If caller principal does not match task principal ownership, response is `403`.
