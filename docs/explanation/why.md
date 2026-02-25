# Why ACP

ACP exists to separate governance decisions from application code.

Agent teams usually start fast with direct API calls. Over time, they need stronger controls:
- who is allowed to call what,
- which actions need human approval,
- how to prove decisions after incidents,
- how to control risk without blocking delivery.

ACP gives one place to apply those controls consistently.

## What changes with ACP

Without ACP:
- each service implements its own checks,
- policy logic is duplicated,
- approvals are manual and inconsistent,
- logs are hard to correlate to tenant/agent/run.

With ACP:
- all requests pass through one Gateway,
- each request gets canonical identity (`Principal`) and action (`Tool`) context,
- routing is deterministic and testable,
- approval lifecycle is enforced in code,
- audit and usage metadata are emitted in one model.

## Concrete outcomes

- Faster audits: one event model across all actions.
- Safer rollouts: start in audit-only mode, then incrementally enforce.
- Lower incident MTTR: approvals, decisions, and upstream outcomes are linked.
- Better compliance posture: explicit policy and approval evidence.

## What ACP is not

- It is not a replacement for upstream API auth.
- It is not a full workflow engine.
- It is not a UI product in this repository.

## When ACP is a good fit

- You run multiple agents or workflows.
- You need explicit approvals for risky actions.
- You need evidence for security/compliance reviews.

## When ACP is not a good fit

- You only have a single internal automation with no governance requirements.
- You cannot add a gateway hop in your architecture.

## Adoption path

1. Start with audit-only (`passThrough` everywhere).
2. Block high-risk actions (for example `DELETE`).
3. Add approvals for prod writes.
4. Add OPA when rules become too dynamic for static routing.

## Next steps

- [Core concepts](./concepts.md)
- [Architecture](./architecture.md)
