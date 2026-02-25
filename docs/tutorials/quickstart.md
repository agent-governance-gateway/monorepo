# Quickstart Tutorial

This tutorial runs ACP in under 10 minutes.

## Prerequisites

- Node.js 20+
- pnpm
- Internet access to reach `https://httpbin.org` (used by the built-in demo tool)

## 1. Start the gateway

From repository root:

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Success looks like:

```text
ACP gateway is running on http://localhost:3100
```

## 2. Send a request that requires approval

The example config requires approval for `POST` when principal `env=prod`.

```bash
curl -i -X POST http://localhost:3100/post \
  -H 'x-acp-tool-id: demo-httpbin' \
  -H 'content-type: application/json' \
  -H 'x-api-key: demo-prod-agent-key' \
  -d '{"message":"hello"}'
```

Expected status: `202`

Expected body:

```json
{
  "status": "approval_required",
  "approval_task_id": "<TASK_ID>",
  "poll_url": "/approvals/<TASK_ID>",
  "reason": "route requires approval"
}
```

## 3. Approve the task

```bash
curl -i -X POST http://localhost:3100/approvals/<TASK_ID>/decision \
  -H 'content-type: application/json' \
  -H 'x-api-key: demo-prod-agent-key' \
  -d '{"status":"approved","decidedBy":"operator","reason":"approved for demo"}'
```

Expected status: `200`

Expected body:

```json
{ "status": "approved" }
```

## 4. Retry with approval header

```bash
curl -i -X POST http://localhost:3100/post \
  -H 'x-acp-tool-id: demo-httpbin' \
  -H 'content-type: application/json' \
  -H 'x-api-key: demo-prod-agent-key' \
  -H 'x-acp-approval-task-id: <TASK_ID>' \
  -H 'x-idempotency-key: req-001' \
  -d '{"message":"hello"}'
```

Expected status: `200` (upstream success status)

## 5. Verify one-time consume

Retry the same task again:

```bash
curl -i -X POST http://localhost:3100/post \
  -H 'x-acp-tool-id: demo-httpbin' \
  -H 'content-type: application/json' \
  -H 'x-api-key: demo-prod-agent-key' \
  -H 'x-acp-approval-task-id: <TASK_ID>' \
  -H 'x-idempotency-key: req-002' \
  -d '{"message":"hello"}'
```

Expected status: `409`

Expected body:

```json
{ "error": "already_consumed", "message": "approval task already consumed" }
```

## Common mistakes

- `400 missing_upstream`: request fell back to a tool without `resolveUpstream` and you did not send `x-acp-upstream-url`.
- wrong tool selected: set `x-acp-tool-id: demo-httpbin` for this tutorial flow.
- `403 forbidden` on decision endpoint: principal for decision request does not match task owner.
- `409 not_approved`: decision not submitted yet.
- `409 binding_mismatch`: method/host/path/principal changed between request and retry.

## Next steps

- [Approvals End-to-End Tutorial](./approvals-end-to-end.md)
- [How to require approvals in prod](../how-to/prod-approvals.md)
- [Endpoints reference](../reference/endpoints.md)
