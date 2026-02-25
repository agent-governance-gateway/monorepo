# agent-governance-gateway

Agent Governance Gateway (ACP) is an HTTP control plane for agent actions. It sits in front of your real upstream APIs, resolves who is calling, normalizes what action is being requested, applies routing policy, triggers approvals when needed, and emits audit + telemetry.

## Why this exists

Teams ship agents quickly, then struggle with control:
- risky actions are hard to gate,
- approvals are ad-hoc,
- audit trails are incomplete,
- security asks for proof.

ACP gives one consistent control point.

## Who should use it

- Platform engineers running agents in production.
- Security/compliance teams needing decision trails.
- AI teams integrating external tools/APIs and wanting safe rollout.

## 5-minute quickstart (single process, no mocks)

```bash
pnpm install
cp .env.example .env
pnpm dev
```

You should see:
- `approval_required` on first request,
- success on retry with `x-acp-approval-task-id`,
- `already_consumed` on second retry.

Full walkthrough: [docs/quickstart.md](./docs/quickstart.md)

## Subsystems

- `Principals`: who is calling (`tenantId`, `agentId`, `env`, `runId`, ...)
- `Tools`: normalize request into `tool/action/resource/approvalBind`
- `Routing Rules`: ordered rules (`passThrough`, `deny`, `requireApproval`, `enforcePolicy`)
- `Approvals`: task lifecycle + one-time consume
- `Proxying`: forwards to real upstream from `x-acp-upstream-url`
- `Audit`: lifecycle events to sinks + DB (when postgres store is enabled)
- `OpenTelemetry`: spans/metrics (disabled by default)
- `OPA`: policy decision hook (disabled by default)

## Core headers

- `x-acp-upstream-url`
- `x-acp-approval-task-id`
- `x-idempotency-key` (recommended)

## Docs

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
