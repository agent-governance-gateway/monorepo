# Routing Rules

Routing is a simple ordered array. First match wins.

## Actions

- `passThrough`
- `deny`
- `requireApproval`
- `enforcePolicy`

## Example: allow-all + deny list

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "DELETE" }, action: { type: "deny", reason: "delete_blocked" } },
  ],
}
```

## Example: prod writes require approval

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "POST", env: "prod" }, action: { type: "requireApproval", handler: "webhook" } },
  ],
}
```

## Example: allow all except specific tool/action/resource

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    {
      match: { tool: "openai-like", action: "chat.completions", resource: /api\.openai\.com/ },
      action: { type: "requireApproval", handler: "webhook" },
    },
    {
      match: { tool: "github", action: "repo.delete" },
      action: { type: "deny", reason: "repo_delete_blocked" },
    },
  ],
}
```

## Two-phase matching behavior

Gateway optimizes matching in two steps:
1. Pre-match using raw request + principal (`method/host/path/channel/agent/env`).
2. If rule needs `tool/action/resource`, normalize request and match again.

## Enforce policy (OPA)

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [{ match: { method: "POST" }, action: { type: "enforcePolicy" } }],
}
```

Then OPA decision maps to allow/deny/approval.

## Expected denied response

```json
{ "error": "denied", "reason": "delete_blocked" }
```
