# FAQ

## Is ACP just an API gateway?

No. ACP focuses on agent governance: canonical actions, principal-aware routing, approval lifecycle, and audit events.

## Do I need OPA?

No. OPA is optional and disabled by default.

## Do I need OpenTelemetry?

No. OTel is optional and disabled by default.

## How are agents identified?

Via Principal resolvers (`principals/*.ts`) using headers, domain mapping, or custom logic.

## Does ACP store secrets?

Not by default for request payloads. Sensitive headers are redacted in canonical metadata used for audit/telemetry.

## Does ACP support MCP and egress today?

Not as runtime adapters yet. Types include channels (`http|mcp|egress`), but current request adapter sets `channel: "http"`.

## Can I use ACP with n8n/LangGraph/custom orchestrators?

Yes, if they can call HTTP endpoints and set headers.

## Why both audit and OTel?

- Audit: governance/compliance trail.
- OTel: performance and reliability signals.

## Can approval be reused?

No. After successful execution, task is marked consumed and second use returns `already_consumed`.
