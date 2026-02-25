# Recipes (No Mocks)

## Audit-only rollout

```ts
routing: { defaultAction: { type: "passThrough" }, rules: [] },
audit: { sinks: ["stdout"] },
```

## Block DELETE

```ts
rules: [
  { match: { method: "DELETE" }, action: { type: "deny", reason: "delete_blocked" } },
]
```

## Require approval for prod writes

```ts
rules: [
  { match: { method: "POST", env: "prod" }, action: { type: "requireApproval", handler: "manual" } },
  { match: { method: "PUT", env: "prod" }, action: { type: "requireApproval", handler: "manual" } },
  { match: { method: "PATCH", env: "prod" }, action: { type: "requireApproval", handler: "manual" } },
]
```

## Allow all but deny A/B/C

```ts
rules: [
  { match: { method: "DELETE" }, action: { type: "deny", reason: "delete_blocked" } },
  { match: { host: "api.github.com", path: /^\/repos\/.+/, method: "DELETE" }, action: { type: "deny", reason: "github_repo_delete_blocked" } },
  { match: { tool: "openai-like", action: "embeddings.create" }, action: { type: "deny", reason: "embedding_blocked" } },
]
```

## Subdomain-based agentId

Use `apps/example-basic/principals/20-domain.ts`.

## Header-based run attribution

Use `apps/example-basic/principals/01-headers.ts` headers:
- `x-agent-id`
- `x-tenant-id`
- `x-workflow-id`
- `x-execution-id`
- `x-run-id`

## Manual approval flow (curl)

1. Send request with `x-acp-upstream-url` and `x-env: prod`.
2. Copy `approval_task_id` from `202` response.
3. Approve manually:

```bash
curl -X POST http://localhost:3100/approvals/<TASK_ID>/decision \
  -H 'content-type: application/json' \
  -d '{"status":"approved","decidedBy":"manual"}'
```

4. Retry with `x-acp-approval-task-id`.
5. Retry again to confirm `already_consumed`.

## Security checklist

- [ ] deny destructive methods by default
- [ ] require approvals in prod writes
- [ ] protect decision endpoint
- [ ] keep default redaction/no body logging
- [ ] route stdout audit logs to durable log storage in production
