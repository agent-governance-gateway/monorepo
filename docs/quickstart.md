# Quickstart (No Mocks, Single Process)

This quickstart runs only the Gateway. You will use:
- a real upstream URL via `x-acp-upstream-url`
- manual approval via Gateway API (`POST /approvals/:id/decision`)

## 0) Prerequisites

- Node.js + pnpm
- Internet access for demo upstream (or your own internal upstream URL)

## 1) Start Gateway (one command)

From repo root:

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Gateway runs on `http://localhost:3100`.

> NOTE
> Default example store mode is memory (`STORE_TYPE=memory`), so Postgres is not required.

## 2) Choose upstream URL

- Option A (recommended): your own internal endpoint
- Option B (demo): `https://httpbin.org/post`

Set shell variable:

```bash
export UPSTREAM_URL="https://httpbin.org/post"
```

## 3) Send first request (expect approval_required)

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'content-type: application/json' \
  -H 'x-env: prod' \
  -H 'x-agent-id: agent-demo' \
  -H 'x-tenant-id: tenant-demo' \
  -H "x-acp-upstream-url: ${UPSTREAM_URL}" \
  -d '{"message":"hello"}'
```

Expected status: `202`

Expected body shape:

```json
{
  "status": "approval_required",
  "approval_task_id": "<id>",
  "poll_url": "/approvals/<id>",
  "reason": "route requires approval"
}
```

Save `approval_task_id` as `<TASK_ID>`.

## 4) Approve manually via gateway API

```bash
curl -i -X POST http://localhost:3100/approvals/<TASK_ID>/decision \
  -H 'content-type: application/json' \
  -d '{"status":"approved","decidedBy":"manual-operator","reason":"approved for demo"}'
```

## 5) Retry with approval header (expect executed)

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'content-type: application/json' \
  -H 'x-env: prod' \
  -H 'x-agent-id: agent-demo' \
  -H 'x-tenant-id: tenant-demo' \
  -H "x-acp-upstream-url: ${UPSTREAM_URL}" \
  -H 'x-acp-approval-task-id: <TASK_ID>' \
  -H 'x-idempotency-key: req-001' \
  -d '{"message":"hello"}'
```

Expected status: `200` (or upstream success status).

## 6) Retry same task again (must fail)

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'content-type: application/json' \
  -H 'x-env: prod' \
  -H 'x-agent-id: agent-demo' \
  -H 'x-tenant-id: tenant-demo' \
  -H "x-acp-upstream-url: ${UPSTREAM_URL}" \
  -H 'x-acp-approval-task-id: <TASK_ID>' \
  -H 'x-idempotency-key: req-002' \
  -d '{"message":"hello"}'
```

Expected status: `409`

Expected error:

```json
{
  "error": "already_consumed",
  "message": "approval task already consumed"
}
```

## 7) Extra checks

### Deny rule (`DELETE`)

```bash
curl -i -X DELETE http://localhost:3100/invoke \
  -H "x-acp-upstream-url: ${UPSTREAM_URL}"
```

Expected: `403`

```json
{ "error": "denied", "reason": "delete_is_forbidden" }
```

### Binding mismatch (`409`)

Retry using same task id but different path/method/host/principal; expected:

```json
{ "error": "binding_mismatch", "message": "approval binding mismatch" }
```

## Header cheat sheet (beginner)

- `x-acp-upstream-url`: where Gateway should proxy this request.
- `x-acp-approval-task-id`: only for approved retry.
- `x-idempotency-key`: recommended unique key for retries.

## Troubleshooting

- `missing_upstream`: missing `x-acp-upstream-url`.
- `not_approved`: approval decision not set yet.
- `approval_not_found`: wrong task id.
