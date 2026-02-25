# Configuration

ACP uses config-as-code via `defineConfig`.

## Minimal config

```ts
import { defineConfig } from "@acp/config";

export default defineConfig(() => ({
  gateway: { port: 3100 },
  store: { type: "memory" },
  tools: { dir: "./tools" },
  principals: { dir: "./principals" },
  approvals: { dir: "./approvals" },
  sinks: { dir: "./sinks" },
  routing: {
    defaultAction: { type: "passThrough" },
    rules: [],
  },
  opa: { enabled: false, url: "http://localhost:8181/v1/data/acp/decision" },
  otel: { enabled: false, otlpEndpoint: "http://localhost:4318", serviceName: "acp-gateway" },
}));
```

## Example app config (current repo)

`apps/example-basic/acp.config.ts` uses:
- auto-discovery for tools/principals/approvals/sinks
- default pass-through
- deny all `DELETE`
- require approval for `POST/PUT/PATCH` when `env=prod`
- `store` from env (`memory` by default, `postgres` optional)

## Store (single control-plane store)

`store` is required and used for internal ACP state.

- `store.type = "memory"`: in-memory approvals, no DB persistence.
- `store.type = "postgres"`: uses one Postgres store for approvals, request records, audit records, and cost records.

Example:

```ts
store: {
  type: "postgres",
  connection: { url: "postgres://postgres:postgres@localhost:5432/postgres" },
}
```

Env used by the example:

- `STORE_TYPE=memory` (default)
- `STORE_TYPE=postgres` + `STORE_URL=postgres://...`

Aliases still accepted by env helper: `DATABASE_URL`, `DB_URL`, `APPROVALS_STORE`, `APPROVALS_DB_URL`.

## Audit sink selection

`audit.sinks` is optional.

- If omitted, gateway uses default sink ids: `stdout` and `stdout-json` (when available).
- If set, gateway uses only the listed sink ids.

Example:

```ts
audit: {
  sinks: ["stdout"],
}
```

## Routing examples

### Default demo mode (allow unless matched)

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "DELETE" }, action: { type: "deny", reason: "delete_is_forbidden" } },
  ],
}
```

### Strict mode (default deny) with explicit OpenAI/Slack rules

```ts
routing: {
  defaultAction: { type: "deny", reason: "default_deny" },
  rules: [
    { match: { tool: "openai", action: "chat.completions" }, action: { type: "passThrough" } },
    { match: { tool: "slack", action: "chat.postMessage" }, action: { type: "requireApproval", handler: "manual", ttlMs: 120000 } },
  ],
}
```

### Prod writes require approval

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "POST", env: "prod" }, action: { type: "requireApproval", handler: "manual", ttlMs: 300000 } },
    { match: { method: "PUT", env: "prod" }, action: { type: "requireApproval", handler: "manual", ttlMs: 300000 } },
    { match: { method: "PATCH", env: "prod" }, action: { type: "requireApproval", handler: "manual", ttlMs: 300000 } },
  ],
}
```

## Auto-discovery and globals

Gateway loads all default exports from configured dirs. Plugin files can use global helpers:
- `defineTool`
- `definePrincipalResolver`
- `defineApprovalHandler`
- `defineSink`

No manual imports required in plugin files.

## Run API

Minimal bootstrap:

```ts
import configFactory from "./acp.config.js";
import { runGateway } from "@acp/gateway";

runGateway(configFactory, { exitOnError: true });
```

`runGateway` starts server, binds process signals, and logs startup by default.

## Proxy mode note

Gateway requires header `x-acp-upstream-url` for proxy execution.
