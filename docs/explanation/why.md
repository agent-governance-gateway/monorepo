# Why ACP

ACP exists to separate governance from business logic.

Without ACP, each service decides auth, risk controls, approvals, and logging differently.
That creates drift and weak control.

ACP centralizes these concerns:
- identity resolution (`Principal`)
- action normalization (`Tool`)
- deterministic routing decisions
- approval lifecycle enforcement
- auditable outcomes

This lets teams ship agents fast without giving up control.

## When ACP is a good fit

- You run multiple agents or workflows.
- You need explicit approvals for risky actions.
- You need evidence for security/compliance reviews.

## When ACP is not a good fit

- You only have a single internal automation with no governance requirements.
- You cannot add a gateway hop in your architecture.

## Next steps

- [Core concepts](./concepts.md)
- [Architecture](./architecture.md)
