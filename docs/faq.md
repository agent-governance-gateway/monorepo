# FAQ

## Is ACP just an API gateway?

No. ACP is a governance gateway focused on principal resolution, routing decisions, approvals, and audit attribution for agent actions.

## Do I have to use OPA?

No. OPA is optional and disabled by default.

## Do I have to use OpenTelemetry?

No. OpenTelemetry is optional and disabled by default.

## Do I always need `x-acp-upstream-url`?

No. If the matched tool defines `resolveUpstream`, gateway uses that and header is optional.
You need `x-acp-upstream-url` only for tools without pinned upstream.

## What is `x-acp-tool-id` for?

It selects a tool by id when that tool does not define `match`.
Example: `x-acp-tool-id: demo-httpbin`.

## How are principals identified?

Through resolver plugins. You can use headers, domain/subdomain patterns, API keys, or combinations.

## Does ACP store secrets?

ACP redacts sensitive headers in canonical metadata and does not log request body by default.

## Is MCP supported?

MCP-over-HTTP routes are supported at `POST /mcp` and `POST /mcp/*`.
Native egress channel adapters are not supported yet.

## Next steps

- [Concepts](./explanation/concepts.md)
- [Quickstart](./tutorials/quickstart.md)
