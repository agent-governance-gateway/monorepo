# Approvals

Approvals are triggered by routing rules (`requireApproval`) or OPA decision (`require_approval`).

## Lifecycle

1. Gateway creates task (`pending`).
2. Returns `202` with `approval_task_id` and `poll_url`.
3. Approver posts decision to `/approvals/:id/decision`.
4. Client retries original request with `x-acp-approval-task-id`.
5. After successful upstream response, task is marked `consumed`.

## Endpoints

- `GET /approvals/:id`
- `POST /approvals/:id/decision`

(If `basePath` is set, endpoints are prefixed.)

## Binding rules

Gateway binds approval to:
- `principalKey`
- `method`
- `host`
- `path`
- optional `approvalBind`

No body hashing by default.

## Retry headers

- required: `x-acp-approval-task-id`
- recommended: `x-idempotency-key`
- also needed for execution: `x-acp-upstream-url`

## Example flow (curl)

### Request requiring approval

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'x-env: prod' \
  -H 'x-agent-id: agent-demo' \
  -H 'x-tenant-id: tenant-a' \
  -H 'x-acp-upstream-url: http://localhost:3200/v1/chat/completions' \
  -H 'content-type: application/json' \
  -d '{"prompt":"hello"}'
```

Expected `202`:

```json
{
  "status": "approval_required",
  "approval_task_id": "<id>",
  "poll_url": "/approvals/<id>"
}
```

### Approve

```bash
curl -i -X POST http://localhost:3100/approvals/<id>/decision \
  -H 'content-type: application/json' \
  -d '{"status":"approved","decidedBy":"ops"}'
```

### Retry execute

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'x-env: prod' \
  -H 'x-agent-id: agent-demo' \
  -H 'x-tenant-id: tenant-a' \
  -H 'x-acp-upstream-url: http://localhost:3200/v1/chat/completions' \
  -H 'x-acp-approval-task-id: <id>' \
  -H 'x-idempotency-key: req-1' \
  -H 'content-type: application/json' \
  -d '{"prompt":"hello"}'
```

### Retry again (expected `409`)

```json
{ "error": "already_consumed", "message": "approval task already consumed" }
```

### Binding mismatch (expected `409`)

```json
{ "error": "binding_mismatch", "message": "approval binding mismatch" }
```

## Signature verification (optional)

If `decisionSigningSecret` is configured, gateway requires `x-acp-signature` for decision endpoint.

> NOTE
> Current gateway code builds `decisionUrl` as `http://localhost:<port>/...` inside approval handler payload.
> This works in local/same-host setups. For remote approver systems, ensure they can reach that URL (or adapt deployment/networking accordingly).

## Security notes

> WARNING
> Restrict who can call `/approvals/:id/decision`.

> TIP
> Always send `x-idempotency-key` on retry.
