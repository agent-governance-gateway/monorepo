# Configuration

ACP uses config-as-code via `defineConfig`.

## Complete Config Shape (Reference)

```ts
import { defineConfig } from "@acp/config";

export default defineConfig(() => ({
  gateway: {
    port: 3100,
    basePath: "/", // optional
  },

  // Auto-discovery
  tools: { dir: "./tools" },
  principals: { dir: "./principals" },
  approvals: { dir: "./approvals" },
  sinks: { dir: "./sinks" },

  routing: {
    defaultAction: { type: "passThrough" },
    rules: [],
  },

  approvalsRuntime: {
    store: {
      type: "postgres",
      url: "postgres://postgres:postgres@localhost:5432/postgres",
    },
    defaultHandlerId: "webhook",
    decisionSigningSecret: "replace-me",
  },

  audit: {
    sinks: ["stdout"],
  },

  opa: {
    enabled: false,
    url: "http://opa:8181/v1/data/acp/decision",
  },

  otel: {
    enabled: false,
    otlpEndpoint: "http://localhost:4318",
    serviceName: "acp-gateway",
  },
}));
```

## Minimal Config (Auto-Discovery)

```ts
import { defineConfig } from "@acp/config";

export default defineConfig(() => ({
  gateway: { port: 3100 },
  tools: { dir: "./tools" },
  principals: { dir: "./principals" },
  approvals: { dir: "./approvals" },
  sinks: { dir: "./sinks" },
  routing: {
    defaultAction: { type: "passThrough" },
    rules: [],
  },
  opa: { enabled: false, url: "http://localhost:8181/v1/data/acp/decision" },
  otel: { enabled: false, otlpEndpoint: "http://localhost:4318" },
}));
```

## Principal-Centric Configuration Patterns

The `Principal` drives safe routing decisions. Configure resolvers first, then rules.

### Pattern A: Header-based Principal (fastest)

Use headers from trusted internal callers.

```ts
// principals/01-header.ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "header-principal",
  resolve: (ctx) => ({
    tenantId: typeof ctx.headers["x-tenant-id"] === "string" ? ctx.headers["x-tenant-id"] : undefined,
    env: typeof ctx.headers["x-env"] === "string" ? ctx.headers["x-env"] : "dev",
    agentId: typeof ctx.headers["x-agent-id"] === "string" ? ctx.headers["x-agent-id"] : "agent-unknown",
  }),
});
```

### Pattern B: Service Principal + Workflow metadata

```ts
// principals/02-service.ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "service-principal",
  resolve: (ctx) => ({
    serviceId: typeof ctx.headers["x-service-id"] === "string" ? ctx.headers["x-service-id"] : undefined,
    workflowId: typeof ctx.headers["x-workflow-id"] === "string" ? ctx.headers["x-workflow-id"] : undefined,
    runId: typeof ctx.headers["x-run-id"] === "string" ? ctx.headers["x-run-id"] : undefined,
  }),
});
```

### Pattern C: Subdomain tenant mapping

```ts
// principals/03-subdomain.ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "subdomain-tenant",
  resolve: (ctx) => {
    const host = ctx.host.toLowerCase();
    const tenant = host.endsWith(".acme.internal") ? host.replace(".acme.internal", "") : undefined;
    return tenant ? { tenantId: tenant } : null;
  },
});
```

## Routing Rules Examples

### Allow all, deny destructive requests

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "DELETE" }, action: { type: "deny", reason: "delete_blocked" } },
    { match: { method: "PATCH", path: /^\/admin\// }, action: { type: "deny", reason: "admin_patch_blocked" } },
  ],
}
```

### Require approval for prod writes only

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    {
      match: { method: "POST", env: "prod" },
      action: { type: "requireApproval", handler: "webhook", ttlMs: 300000 },
    },
    {
      match: { method: "PUT", env: "prod" },
      action: { type: "requireApproval", handler: "webhook", ttlMs: 300000 },
    },
  ],
}
```

### Enforce policy with OPA for specific tool actions

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { tool: "openai-like", method: "POST" }, action: { type: "enforcePolicy" } },
  ],
},
opa: {
  enabled: true,
  url: "http://opa:8181/v1/data/acp/decision",
}
```

## Full Usage Flows (Copy/Paste)

### Flow 1: Dev sandbox (audit-first)

```ts
export default defineConfig(() => ({
  gateway: { port: 3100 },
  tools: { dir: "./tools" },
  principals: { dir: "./principals" },
  approvals: { dir: "./approvals" },
  sinks: { dir: "./sinks" },
  routing: { defaultAction: { type: "passThrough" }, rules: [] },
  audit: { sinks: ["stdout"] },
  opa: { enabled: false, url: "http://localhost:8181/v1/data/acp/decision" },
  otel: { enabled: false, otlpEndpoint: "http://localhost:4318" },
}));
```

### Flow 2: Staging hardened (deny destructive)

```ts
export default defineConfig(() => ({
  gateway: { port: 3100 },
  tools: { dir: "./tools" },
  principals: { dir: "./principals" },
  approvals: { dir: "./approvals" },
  sinks: { dir: "./sinks" },
  routing: {
    defaultAction: { type: "passThrough" },
    rules: [
      { match: { method: "DELETE" }, action: { type: "deny", reason: "delete_blocked" } },
    ],
  },
  audit: { sinks: ["stdout", "postgres"] },
  opa: { enabled: false, url: "http://opa:8181/v1/data/acp/decision" },
  otel: { enabled: true, otlpEndpoint: "http://otel-collector:4318", serviceName: "acp-staging" },
}));
```

### Flow 3: Production guarded (approvals + OPA)

```ts
export default defineConfig(() => ({
  gateway: { port: 3100, basePath: "/acp" },
  tools: { dir: "./tools" },
  principals: { dir: "./principals" },
  approvals: { dir: "./approvals" },
  sinks: { dir: "./sinks" },
  routing: {
    defaultAction: { type: "passThrough" },
    rules: [
      { match: { method: "DELETE" }, action: { type: "deny", reason: "delete_blocked" } },
      { match: { method: "POST", env: "prod" }, action: { type: "requireApproval", handler: "webhook", ttlMs: 300000 } },
      { match: { tool: "openai-like", method: "POST" }, action: { type: "enforcePolicy" } },
    ],
  },
  approvalsRuntime: {
    store: { type: "postgres", url: "postgres://postgres:postgres@db:5432/postgres" },
    defaultHandlerId: "webhook",
    decisionSigningSecret: "replace-with-secret-manager-value",
  },
  audit: { sinks: ["postgres"] },
  opa: { enabled: true, url: "http://opa:8181/v1/data/acp/decision" },
  otel: { enabled: true, otlpEndpoint: "http://otel-collector:4318", serviceName: "acp-prod" },
}));
```

## Upstream Proxy Mode (MVP)

Gateway expects `X-ACP-Upstream-Url` to know where to proxy.

```bash
curl -X POST http://localhost:3100/invoke \
  -H 'X-ACP-Upstream-Url: https://api.example.com/v1/do' \
  -H 'x-env: prod' \
  -H 'x-agent-id: agent-payments' \
  -H 'x-tenant-id: tenant-a' \
  -H 'content-type: application/json' \
  -d '{"amount":1500,"currency":"USD"}'
```

## TypeScript Bootstrapping

```ts
import { createGateway } from "@acp/gateway";
import config from "./acp.config.js";

const gateway = await createGateway(config, { cwd: process.cwd() });
await gateway.start();
```

## Important Notes

> **Note**
> OPA and OpenTelemetry are built in, but disabled by default.

> **Warning**
> Without `X-ACP-Upstream-Url`, request execution fails in MVP proxy mode.

> **Tip**
> Add principal resolvers before writing advanced routing rules. Rules are only as good as principal quality.
