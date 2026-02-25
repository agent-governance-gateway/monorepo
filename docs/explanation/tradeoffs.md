# Trade-offs

ACP optimizes for maintainable governance, not maximum policy expressiveness.

## Benefits

- Centralized governance for agent traffic.
- Consistent approval flow and audit trail.
- Flexible plugin model with low code coupling.
- Clear migration path from permissive mode to strict governance.

## Costs

- Extra network hop through gateway.
- Additional configuration to maintain.
- Policy mistakes can block traffic.
- Teams must maintain resolver/tool quality to preserve attribution and safety.

## Design choices

- Simple rule arrays over complex DSL: easier for junior maintainers.
- Approval binding excludes body hash by default: avoids fragile replays tied to payload serialization.
- Tool-level `resolveUpstream`: safer than trusting caller-provided upstream header.
- Optional `match` + `x-acp-tool-id`: allows explicit tool selection for controlled integration paths.

## Why this simplicity is intentional

- Predictable debugging: first-match-wins routing is easy to reason about.
- Lower onboarding cost: plugin interfaces are plain objects, no runtime magic.
- Safer operations: fewer hidden interactions between policies and plugins.

## Not supported yet

- Native egress channel adapter.

Current workaround: represent egress actions as HTTP requests and use custom tools for normalization.

## When to choose a different approach

If you need:
- complex graph policy evaluation inside request path,
- non-HTTP control protocols beyond MCP-over-HTTP,
- built-in approval UI/workflows,
you may need ACP plus additional platform components.

## Next steps

- [Why ACP](./why.md)
- [OPA how-to](../how-to/opa-enable.md)
