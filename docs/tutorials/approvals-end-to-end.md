# Approvals End-to-End Tutorial

This tutorial focuses on approval lifecycle details.

## Prerequisites

- Gateway running (`pnpm dev`)
- A prod principal (`x-api-key: demo-prod-agent-key`)

## Lifecycle

`pending -> approved|denied -> consumed`

A task is marked `consumed` only after a successful upstream response.

## 1. Create task

```bash
curl -i -X POST http://localhost:3100/post \
  -H 'x-acp-tool-id: demo-httpbin' \
  -H 'x-api-key: demo-prod-agent-key' \
  -H 'content-type: application/json' \
  -d '{"prompt":"hello"}'
```

Expected: `202 approval_required`

## 2. Poll task

```bash
curl -i http://localhost:3100/approvals/<TASK_ID> \
  -H 'x-api-key: demo-prod-agent-key'
```

Expected: task JSON with `status: "pending"`.

## 3. Deny path

```bash
curl -i -X POST http://localhost:3100/approvals/<TASK_ID>/decision \
  -H 'x-api-key: demo-prod-agent-key' \
  -H 'content-type: application/json' \
  -d '{"status":"denied","reason":"unsafe action"}'
```

Then retry original request with `x-acp-approval-task-id: <TASK_ID>`.

Expected status: `409`

Expected body:

```json
{ "error": "not_approved", "message": "approval task is denied" }
```

## 4. Approved path

Create a new task, approve it, then retry with approval header.

Expected result: upstream executes and task transitions to `consumed`.

## 5. Binding mismatch demo

Create and approve a task for `POST /post`, then retry against a different path (for example `/other-path`) with the same task.

Expected status: `409`

Expected body:

```json
{ "error": "binding_mismatch", "message": "approval binding mismatch" }
```

## Header contract

- `x-acp-approval-task-id`: required for retry.
- `x-idempotency-key`: recommended for retry.
- `x-acp-upstream-url`: optional fallback. Use it only when the matched tool does not define `resolveUpstream`.

## Next steps

- [Approvals patterns](../how-to/prod-approvals.md)
- [Approvals endpoint reference](../reference/endpoints.md#approvals)
- [Approval model explanation](../explanation/security-model.md)
