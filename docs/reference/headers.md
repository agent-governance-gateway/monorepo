# Headers Reference

## Internal ACP headers

- `x-acp-approval-task-id`
- `x-acp-upstream-url`
- `x-acp-tool-id`

## Recommended idempotency header

- `x-idempotency-key`

## Principal-related headers used by example resolvers

- `x-api-key`
- `x-agent-id`
- `x-tenant-id`
- `x-env`
- `x-workflow-id`
- `x-execution-id`
- `x-run-id`

## Header forwarding behavior

Gateway strips these from upstream calls:
- all headers beginning with `x-acp-`
- `host`
- `content-length`

Other string headers are forwarded.

## Sensitive header redaction

Redacted in canonical metadata:
- `authorization`
- `cookie`
- `set-cookie`
- `proxy-authorization`
- `x-api-key`
- `x-auth-token`

## Next steps

- [Endpoints reference](./endpoints.md)
- [Security model](../explanation/security-model.md)
