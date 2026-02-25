# Routing Rules

Routing is an ordered array. First matching rule wins.

## Actions

- `passThrough`: execute upstream call
- `deny`: return `403`
- `requireApproval`: create approval task and return `202`
- `enforcePolicy`: ask OPA, then map decision to action

## Match fields

You can match by:
- request: `channel`, `method`, `host`, `path`
- principal: `agentId`, `env`
- tool-normalized target: `tool`, `action`, `resource`

## Two-phase matching

Gateway evaluates:
1. Fast pass for rules that only need request/principal fields.
2. Full pass including `tool/action/resource` after normalization.

## Common patterns

### 1) Allow all, deny destructive

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "DELETE" }, action: { type: "deny", reason: "delete_blocked" } },
  ],
}
```

### 2) Prod writes require approval

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "POST", env: "prod" }, action: { type: "requireApproval", handler: "manual" } },
    { match: { method: "PUT", env: "prod" }, action: { type: "requireApproval", handler: "manual" } },
    { match: { method: "PATCH", env: "prod" }, action: { type: "requireApproval", handler: "manual" } },
  ],
}
```

### 3) Strict default deny for OpenAI/Slack only

```ts
routing: {
  defaultAction: { type: "deny", reason: "default_deny" },
  rules: [
    { match: { tool: "openai", action: "chat.completions" }, action: { type: "passThrough" } },
    { match: { tool: "openai", action: "unknown" }, action: { type: "deny", reason: "unsupported_openai_action" } },
    { match: { tool: "slack", action: "chat.postMessage" }, action: { type: "requireApproval", handler: "manual", ttlMs: 120000 } },
    { match: { tool: "slack", action: "unknown" }, action: { type: "deny", reason: "unsupported_slack_action" } },
  ],
}
```

### 4) OPA-driven dynamic policy

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [{ match: { method: "POST" }, action: { type: "enforcePolicy" } }],
}
```

## Response examples

Denied:

```json
{ "error": "denied", "reason": "delete_blocked" }
```

Approval required:

```json
{
  "status": "approval_required",
  "approval_task_id": "task_xxx",
  "poll_url": "/approvals/task_xxx",
  "reason": "route requires approval"
}
```
