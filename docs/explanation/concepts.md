# Core Concepts

ACP uses a small set of concepts. Most behavior in the codebase is built from these.

## Principal

`Principal` describes who is calling:
- `tenantId`
- `agentId`
- `env`
- `workflowId`, `executionId`, `runId`

Gateway builds `principalKey` from:
`tenantId|env|agentId|serviceId`

Why it matters:
- routing rules can use principal fields (`env`, `agentId`),
- approval ownership uses `principalKey`,
- audit/cost attribution links back to tenant/agent/run dimensions.

## Tool

A `Tool` classifies raw requests into canonical target fields:
- `tool`
- `action`
- `resource`
- optional `approvalBind`

Tools can also:
- pin upstream destination with `resolveUpstream`,
- emit post-response metadata (`afterRequest`) such as cost usage.

Tool selection modes:
- `match(ctx)` based selection,
- `x-acp-tool-id` selection when `match` is not defined.

## CanonicalAction

`CanonicalAction` is the shared model used by routing, approvals, audit, and OPA.

Think of it as ACP's single source of truth for each request decision.

## Routing rule

First matching rule wins.

Actions:
- `passThrough`
- `deny`
- `requireApproval`
- `enforcePolicy`

Gateway evaluates rules in two phases:
1. fast pass with request/principal fields,
2. full pass with normalized tool/action/resource fields.

## Approval Task

Task lifecycle:
- `pending`
- `approved` or `denied`
- `consumed`

One-time consume: task is consumed only after successful upstream response.

Binding checks prevent approval token misuse across different action contexts.

## Channels

- `http`: supported
- `mcp`: supported through MCP-over-HTTP routes (`/mcp`, `/mcp/*`)
- `egress`: not supported yet

Workaround for egress today: route egress-like operations through HTTP endpoints handled by existing tools.

## Mental model

1. Identify caller (`Principal`).
2. Identify action (`Tool` -> canonical target).
3. Decide (`Routing` and optional `OPA`).
4. Enforce (`deny` or `approval` or execute).
5. Record (`Audit`, optional `OTel`, optional DB persistence).

## Next steps

- [Security model](./security-model.md)
- [Endpoints reference](../reference/endpoints.md)
