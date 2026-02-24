# FAQ

## Isn’t this just an API gateway?

Not exactly. ACP is specifically designed for agent governance:
- canonical action normalization
- approval task lifecycle with one-time consume
- principal-aware routing/policy
- governance-grade audit events

## Why not just logs?

Logs alone do not enforce behavior. ACP both enforces controls and emits audit records.

## Do I have to use OPA or OpenTelemetry?

No. Both are built in but disabled by default.
- Use OPA when you need centralized policy decisions.
- Use OTel when you need deep performance observability.

## How do you identify agents?

Via Principal resolvers (plugin files in `principals/`). You can map headers/tokens/subdomain/context into `agentId`, `tenantId`, `env`, and more.

## Can I use ACP with n8n / LangGraph / custom orchestrators?

Yes. ACP is HTTP-based and can sit in front of any system that can send HTTP requests and headers.

## Does ACP store secrets?

ACP does not need to store request secrets by default. It redacts sensitive headers in audit/telemetry metadata and avoids body logging by default.

## How do retries work after approval?

Client retries the same request with:
- `X-ACP-Approval-Task-Id`
- recommended `X-Idempotency-Key`

Gateway validates binding and approved status, executes once, then marks consumed.

## What happens if I retry again with same task id?

You get `409 already_consumed`.

## Can I run without Postgres?

Yes for development/test paths: in-memory approval store is used when approvals runtime is not configured.
