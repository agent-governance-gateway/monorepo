# Proxying (HTTP)

ACP currently proxies HTTP requests using a target URL header.

## Required header

- `x-acp-upstream-url`

If missing, gateway returns:

```json
{ "error": "missing_upstream", "message": "X-ACP-Upstream-Url header is required" }
```

## Pass-through example

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'x-acp-upstream-url: https://httpbin.org/post' \
  -H 'content-type: application/json' \
  -d '{"prompt":"hello"}'
```

## Approval + retry example

First call (approval required by route):

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'x-env: prod' \
  -H 'x-agent-id: agent-demo' \
  -H 'x-acp-upstream-url: https://httpbin.org/post' \
  -H 'content-type: application/json' \
  -d '{"prompt":"hello"}'
```

Retry after manual approval:

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'x-env: prod' \
  -H 'x-agent-id: agent-demo' \
  -H 'x-acp-upstream-url: https://httpbin.org/post' \
  -H 'x-acp-approval-task-id: <id>' \
  -H 'x-idempotency-key: req-1' \
  -H 'content-type: application/json' \
  -d '{"prompt":"hello"}'
```

## Header forwarding behavior

Gateway strips internal headers before upstream call:
- all `x-acp-*`
- `host`
- `content-length`

Other string headers are forwarded.

> NOTE
> HTTP header names are case-insensitive, but examples here use lowercase to match internal constants.
