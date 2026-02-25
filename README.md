# agent-governance-gateway

Agent Governance Gateway (ACP) is an HTTP governance layer for agent traffic. It normalizes requests, resolves principals, applies routing/policy decisions, supports approval workflows, and emits audit/telemetry.

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

## 5-minute quickstart

```bash
pnpm install
cp .env.example .env
pnpm dev:example
```

You should see:
- `approval_required` on first request,
- success on retry with `x-acp-approval-task-id`,
- `already_consumed` on second retry.

Full walkthrough: [docs/quickstart.md](./docs/quickstart.md)

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
