# Cookbook

## Block destructive methods

```ts
{ match: { method: "DELETE" }, action: { type: "deny", reason: "delete_is_forbidden" } }
```

## Require approval for prod writes

```ts
{ match: { method: "POST", env: "prod" }, action: { type: "requireApproval", handler: "manual" } }
{ match: { method: "PUT", env: "prod" }, action: { type: "requireApproval", handler: "manual" } }
{ match: { method: "PATCH", env: "prod" }, action: { type: "requireApproval", handler: "manual" } }
```

## Allow all but deny specific tool/action/resource

```ts
{ match: { tool: "openai", action: "unknown" }, action: { type: "deny", reason: "unsupported_openai_action" } }
{ match: { tool: "slack", action: "unknown" }, action: { type: "deny", reason: "unsupported_slack_action" } }
```

## Header-based attribution (run/workflow/execution)

Resolver fields:
- `workflowId` from `x-workflow-id`
- `executionId` from `x-execution-id`
- `runId` from `x-run-id`

## Subdomain-based agent identification

```ts
if (ctx.host.endsWith(".agents.local")) {
  return { agentId: ctx.host.replace(".agents.local", "") };
}
```

## Multi-tenant isolation pattern

- Ensure resolver always sets `tenantId`.
- Route by tenant when needed.
- Approval ownership uses `principalKey` and includes tenant in key derivation.

## Safe rollout plan

1. Audit-only mode.
2. Add DELETE deny rule.
3. Enable prod write approvals.
4. Enable OPA for centralized policy.

## Next steps

- [How-to guides](../how-to/audit-only.md)
- [Security model](../explanation/security-model.md)
