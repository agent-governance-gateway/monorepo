# Endpoints Reference

Base path is prefixed by `gateway.basePath` when configured.

## Health

### `GET /healthz`

Response:

```json
{ "ok": true }
```

## Approvals

### `GET /approvals/:id`

- `404 {"error":"not_found"}` if task does not exist
- `403 {"error":"forbidden"}` if principal does not own the task
- `200` with approval task JSON

### `POST /approvals/:id/decision`

Request body:

```json
{ "status": "approved" | "denied", "decidedBy": "optional", "reason": "optional" }
```

Responses:
- `404 {"error":"not_found"}`
- `403 {"error":"forbidden"}`
- `200 {"status":"approved"}` or `200 {"status":"denied"}`

## Proxy execution routes

### `POST /mcp`
### `POST /mcp/*`

MCP-over-HTTP entrypoints. Gateway builds request context with `channel: "mcp"`.

### `ALL /*`

Catch-all HTTP route.

Tool selection behavior:
- If a tool has `match`, gateway uses match-based selection.
- If a tool has no `match`, you can select it with `x-acp-tool-id: <tool.id>`.

## Common response shapes

### Denied

Status: `403`

```json
{ "error": "denied", "reason": "<rule reason>" }
```

### Approval required

Status: `202`

```json
{
  "status": "approval_required",
  "approval_task_id": "<id>",
  "poll_url": "/approvals/<id>",
  "reason": "route requires approval"
}
```

### Approval task already consumed

Status: `409`

```json
{ "error": "already_consumed", "message": "approval task already consumed" }
```

### Approval binding mismatch

Status: `409`

```json
{ "error": "binding_mismatch", "message": "approval binding mismatch" }
```

### Missing upstream fallback

Status: `400`

```json
{ "error": "missing_upstream", "message": "X-ACP-Upstream-Url header is required" }
```

### Tool upstream mismatch

Status: `403`

```json
{
  "error": "upstream_not_allowed",
  "message": "x-acp-upstream-url does not match tool upstream",
  "details": { "expected": "<tool upstream>" }
}
```

## Next steps

- [Headers reference](./headers.md)
- [Approvals tutorial](../tutorials/approvals-end-to-end.md)
