# agent-governance-gateway

Agent Governance Gateway (ACP) is an HTTP governance layer for agent traffic.  
It sits between your agents and real upstream APIs, then decides what should happen:
- allow immediately,
- deny,
- require approval,
- or delegate decision to OPA.

It also records audit and usage/cost metadata so you can explain who did what, when, and why.

## Why this exists

Most teams start with direct agent-to-API calls. It works fast, but control degrades over time.

Without ACP:
- security rules are scattered in app code,
- approvals are manual and inconsistent,
- logs are hard to map to agent/workflow/run,
- policy changes require redeploying many services.

With ACP:
- one control point for routing and approvals,
- one principal model for identity/ownership,
- one approval lifecycle with one-time consume semantics,
- one audit trail and optional cost attribution.

## Who this is for

- Platform engineers running AI agents in production.
- Security/compliance teams needing enforceable controls and traceability.
- AI product teams that need safe rollout without slowing delivery.

## Before vs After ACP

### Before

- Agent calls external API directly.
- Each service invents its own auth and policy logic.
- Destructive actions are blocked inconsistently.
- Incidents are hard to investigate due to fragmented logs.

### After

- Agent calls Gateway.
- Gateway resolves principal (`tenantId`, `agentId`, `env`, `runId`, etc.).
- Gateway normalizes request into `tool/action/resource`.
- Gateway applies routing rules (and OPA if enabled).
- Gateway enforces approval flow where needed.
- Gateway proxies to upstream only when allowed.
- Gateway emits audit + telemetry and optional cost metadata.

## Quickstart (single process, no mocks)

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Then run the no-mocks approval flow from [docs/quickstart.md](./docs/quickstart.md):
1. Request with `x-acp-upstream-url` -> `202 approval_required`
2. Approve via `POST /approvals/:id/decision`
3. Retry with `x-acp-approval-task-id` -> success
4. Retry same task again -> `409 already_consumed`

## Core concepts

- `Principals`: caller identity and attribution fields.
- `Tools`: normalization of raw HTTP to canonical target.
- `Routing Rules`: ordered deterministic actions.
- `Channels`: HTTP and MCP-over-HTTP (`/mcp`).
- `Approval Task`: pending/approved/denied/consumed lifecycle.
- `Audit Sink`: where audit events are written.
- `OPA`: optional external policy engine.
- `OpenTelemetry`: optional traces/metrics.

## Core headers

- `x-acp-upstream-url` (required for execution)
- `x-acp-approval-task-id` (required for approved retry)
- `x-idempotency-key` (recommended on retry)

## Security defaults

- No body logging by default.
- Sensitive headers are redacted (`authorization`, `cookie`, etc.).
- Tools can pin upstream target via `resolveUpstream` to prevent header-based upstream abuse.
- Approval binding is based on principal + method/host/path + optional `approvalBind`.
- Approval tasks are consumed only after successful upstream response.

## Documentation

- [Docs Home](./docs/index.md)
- [Why ACP](./docs/why.md)
- [Concepts](./docs/concepts.md)
- [Quickstart](./docs/quickstart.md)
- [Configuration](./docs/configuration.md)
- [Principals](./docs/principals.md)
- [Tools](./docs/tools.md)
- [Routing](./docs/routing.md)
- [Approvals](./docs/approvals.md)
- [Proxying](./docs/proxying.md)
- [Audit](./docs/audit.md)
- [Observability (OTel)](./docs/observability.md)
- [OPA](./docs/opa.md)
- [Deployment (Local, Docker, Helm)](./docs/deployment.md)
- [Recipes](./docs/recipes.md)
- [Troubleshooting](./docs/troubleshooting.md)
- [FAQ](./docs/faq.md)
