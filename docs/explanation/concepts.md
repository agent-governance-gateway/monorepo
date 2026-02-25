# Core Concepts

## Principal

`Principal` describes who is calling:
- `tenantId`
- `agentId`
- `env`
- `workflowId`, `executionId`, `runId`

Gateway builds `principalKey` from:
`tenantId|env|agentId|serviceId`

## Tool

A `Tool` classifies raw requests into canonical target fields:
- `tool`
- `action`
- `resource`
- optional `approvalBind`

## CanonicalAction

`CanonicalAction` is the shared model used by routing, approvals, audit, and OPA.

## Routing rule

First matching rule wins.

Actions:
- `passThrough`
- `deny`
- `requireApproval`
- `enforcePolicy`

## Approval Task

Task lifecycle:
- `pending`
- `approved` or `denied`
- `consumed`

One-time consume: task is consumed only after successful upstream response.

## Channels

- `http`: supported
- `mcp`: supported through MCP-over-HTTP routes (`/mcp`, `/mcp/*`)
- `egress`: not supported yet

Workaround for egress today: route egress-like operations through HTTP endpoints handled by existing tools.

## Next steps

- [Security model](./security-model.md)
- [Endpoints reference](../reference/endpoints.md)
