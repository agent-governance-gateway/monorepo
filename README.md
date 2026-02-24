# agent-governance-gateway

Agent Governance Gateway (ACP) is a TypeScript gateway runtime that sits between agents and external APIs/tools, turns each request into a canonical action, applies routing and policy decisions, supports human approvals, and emits auditable events.

## Who This Is For

- Platform engineers running agent workloads in production.
- Security/compliance teams that need auditable control points.
- AI application teams integrating LLM tools/APIs and needing safe guardrails.

## Why Teams Adopt ACP

Before ACP:
- Agent traffic goes directly to external APIs.
- Access decisions are spread across app code.
- Approvals are ad-hoc and hard to prove later.

After ACP:
- A single Gateway enforces routing rules and policy decisions.
- Approval Tasks are explicit, traceable, and one-time consumable.
- Audit events are emitted to sinks with security redaction by default.

## Quickstart (Under 5 Minutes)

```bash
pnpm install
cp .env.example .env
pnpm dev:example
```

The example runs three servers (gateway/upstream/approver) and an end-to-end client flow:
1. Request gets `approval_required`.
2. Mock approver decides `approved`.
3. Client retries with `X-ACP-Approval-Task-Id` and succeeds.
4. Second retry fails with `already_consumed`.

Full walkthrough: [docs/quickstart.md](./docs/quickstart.md)

## Core Concepts (Fast Summary)

- `Principal`: who initiated the action (`tenant`, `env`, `agentId`, etc.).
- `Tool`: normalizes raw request into canonical target fields (`tool`, `action`, `resource`, `approvalBind`).
- `Routing Rules`: first-match-wins rules for `passThrough`, `deny`, `requireApproval`, `enforcePolicy`.
- `Approval Task`: pending/approved/denied/consumed lifecycle with one-time execution semantics.
- `Audit Sink`: destination for structured audit events.
- `OPA`: optional policy engine integration (disabled by default).
- `OpenTelemetry`: optional traces/metrics integration (disabled by default).

## Security Defaults

- Sensitive headers are redacted in canonical metadata used for audit/telemetry.
- Request body is not logged by default.
- Approval binding uses principal + method/host/path + optional `approvalBind`.
- Internal `X-ACP-*` headers are not forwarded upstream.

## Documentation

### Start Here
- [Docs Home](./docs/index.md)
- [Why ACP Exists](./docs/why.md)
- [Quickstart](./docs/quickstart.md)

### Learn the Model
- [Concepts](./docs/concepts.md)
- [Configuration](./docs/configuration.md)
- [Plugins](./docs/plugins.md)

### Operate Safely
- [Approvals](./docs/approvals.md)
- [Security](./docs/security.md)
- [Observability](./docs/observability.md)
- [OPA Integration](./docs/opa.md)

### Build Faster
- [Recipes](./docs/recipes.md)
- [FAQ](./docs/faq.md)
