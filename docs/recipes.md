# Recipes (Cookbook)

## Audit-only rollout

```ts
routing: { defaultAction: { type: "passThrough" }, rules: [] },
audit: { sinks: ["stdout"] },
opa: { enabled: false, url: "http://opa:8181/v1/data/acp/decision" },
otel: { enabled: false, otlpEndpoint: "http://localhost:4318" },
```

## Block DELETE everywhere

```ts
rules: [
  { match: { method: "DELETE" }, action: { type: "deny", reason: "delete_blocked" } },
]
```

## Require approval for POST in prod

```ts
rules: [
  { match: { method: "POST", env: "prod" }, action: { type: "requireApproval", handler: "webhook" } },
]
```

## Allow all except GitHub repo deletion

```ts
rules: [
  {
    match: { method: "DELETE", host: "api.github.com", path: /^\/repos\/.+/ },
    action: { type: "deny", reason: "github_repo_delete_blocked" },
  },
]
```

## Tag by run_id/workflow_id (headers)

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "run-tags",
  resolve: (ctx) => ({
    workflowId: typeof ctx.headers["x-workflow-id"] === "string" ? ctx.headers["x-workflow-id"] : undefined,
    runId: typeof ctx.headers["x-run-id"] === "string" ? ctx.headers["x-run-id"] : undefined,
  }),
});
```

## Subdomain -> agentId mapping

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "subdomain-agent",
  resolve: (ctx) => {
    if (!ctx.host.endsWith(".agents.internal")) return null;
    return { agentId: ctx.host.replace(".agents.internal", "") };
  },
});
```

## Multiple tenants

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "tenant",
  resolve: (ctx) => ({
    tenantId: typeof ctx.headers["x-tenant-id"] === "string" ? ctx.headers["x-tenant-id"] : "tenant-default",
    env: typeof ctx.headers["x-env"] === "string" ? ctx.headers["x-env"] : "dev",
  }),
});
```

## OPA: require approval when resource matches pattern

```rego
package acp

default decision = {"decision": "allow"}

decision = {"decision": "require_approval", "reason": "sensitive_resource"} {
  regex.match(".*payments.*", input.target.resource)
  input.request.method == "POST"
}
```

## Send audit to Postgres

```ts
/// <reference types="@acp/config/globals" />
import { PostgresJsonbSink } from "@acp/audit";

const sink = new PostgresJsonbSink({ id: "postgres", url: "postgres://postgres:postgres@localhost:5432/postgres" });
await sink.connect();

export default defineSink(sink);
```

Enable sink:

```ts
audit: { sinks: ["postgres"] }
```

## Troubleshooting: approval stuck pending

Checklist:
1. Confirm Approval Handler endpoint reachable.
2. Confirm approver posts to `/approvals/:id/decision`.
3. If signing enabled, confirm `x-acp-signature` is valid.

## Troubleshooting: binding mismatch

Most common cause: retry request differs from approved request principal/method/host/path/approvalBind.

## Troubleshooting: upstream header missing

If request fails with `missing_upstream`, add:

```http
x-acp-upstream-url: https://target.example/path
```

## Security checklist

- [ ] deny destructive methods by default
- [ ] require approval for prod writes
- [ ] protect decision endpoint
- [ ] keep body logging off
- [ ] enable durable audit sink in production
