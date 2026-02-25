# Proxying

ACP forwards requests to real upstream targets using:
- `x-acp-upstream-url`

For tool packs that define `resolveUpstream`, gateway uses tool-defined upstream instead of trusting header value.
If header is present but does not match tool upstream, gateway returns `403 upstream_not_allowed`.

If missing:

```json
{ "error": "missing_upstream", "message": "X-ACP-Upstream-Url header is required" }
```

## HTTP endpoint

Use any HTTP path (example: `/invoke`):

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'x-acp-upstream-url: https://httpbin.org/post' \
  -H 'content-type: application/json' \
  -d '{"prompt":"hello"}'
```

## MCP endpoint

Use MCP-over-HTTP endpoints:
- `POST /mcp`
- `POST /mcp/*`

Example:

```bash
curl -i -X POST http://localhost:3100/mcp \
  -H 'x-acp-upstream-url: https://httpbin.org/post' \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"search","arguments":{"q":"hello"}}}'
```

Gateway treats this as `channel: "mcp"` and applies the same principal/routing/approval/audit pipeline.

## Header forwarding behavior

Gateway strips before upstream call:
- all `x-acp-*`
- `host`
- `content-length`

Other string headers are forwarded.
