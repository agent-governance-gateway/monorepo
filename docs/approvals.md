# Approvals

Approvals are designed for controlled execution of risky requests.

## Approval Task Basics

When a route requires approval, Gateway:
1. Creates an `Approval Task` with `status: pending`.
2. Calls configured Approval Handler.
3. Returns `202` with:
   - `status: "approval_required"`
   - `approval_task_id`
   - `poll_url`

## One-Time Consume Rule

Approved tasks are one-time executable:
- First successful retry: task becomes `consumed`.
- Second retry with same task id: `409 already_consumed`.

This prevents approval reuse.

## Binding Rules (Misuse Prevention)

On task creation, binding fields are stored:
- `principalKey`
- `method`
- `host`
- `path`
- optional `approvalBind`

On retry, Gateway compares the same fields.
If they differ, retry fails with `binding_mismatch`.

## Polling and Decision Endpoints

### Poll status

```bash
curl -s http://localhost:3100/approvals/<TASK_ID>
```

### Submit decision

```bash
curl -X POST http://localhost:3100/approvals/<TASK_ID>/decision \
  -H 'content-type: application/json' \
  -d '{"status":"approved","decidedBy":"ops","reason":"safe"}'
```

If `decisionSigningSecret` is configured, include signature header expected by your handler design.

## Retry Request with Task ID

```bash
curl -X POST http://localhost:3100/invoke \
  -H 'X-ACP-Upstream-Url: http://localhost:3200/v1/chat/completions' \
  -H 'X-ACP-Approval-Task-Id: <TASK_ID>' \
  -H 'X-Idempotency-Key: req-123' \
  -H 'content-type: application/json' \
  -d '{"prompt":"hello"}'
```

## Recommended Idempotency Practice

Always send `X-Idempotency-Key` on retries.
- It helps trace who consumed approval.
- It helps downstream systems deduplicate request effects.

## Common Failure Responses

- `approval_not_found` (404)
- `not_approved` (409)
- `binding_mismatch` (409)
- `already_consumed` (409)

## Security Notes

> **Warning**
> Do not bind approval to raw body hash by default. Bodies often contain unstable/non-deterministic fields.

> **Note**
> Bind to stable fields (`principalKey`, `method`, `host`, `path`, optional `approvalBind`).
