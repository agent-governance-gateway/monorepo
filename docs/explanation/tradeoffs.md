# Trade-offs

## Benefits

- Centralized governance for agent traffic.
- Consistent approval flow and audit trail.
- Flexible plugin model with low code coupling.

## Costs

- Extra network hop through gateway.
- Additional configuration to maintain.
- Policy mistakes can block traffic.

## Design choices

- Simple rule arrays over complex DSL: easier for junior maintainers.
- Approval binding excludes body hash by default: avoids fragile replays tied to payload serialization.
- Tool-level `resolveUpstream`: safer than trusting caller-provided upstream header.

## Not supported yet

- Native egress channel adapter.

Current workaround: represent egress actions as HTTP requests and use custom tools for normalization.

## Next steps

- [Why ACP](./why.md)
- [OPA how-to](../how-to/opa-enable.md)
