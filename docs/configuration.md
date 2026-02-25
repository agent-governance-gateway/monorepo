# Configuration

ACP uses `defineConfig` (config-as-code).

## Minimal config

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

## Auto-discovery directories

Gateway loads all default exports from:
- `tools/`
- `principals/`
- `approvals/`
- `sinks/`

No manual imports required in config.

## Common production config

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
    ],
  },
  approvalsRuntime: {
    store: { type: "postgres", url: "postgres://postgres:postgres@db:5432/postgres" },
    defaultHandlerId: "webhook",
    decisionSigningSecret: "replace-me",
  },
  audit: { sinks: ["stdout"] },
  opa: { enabled: false, url: "http://opa:8181/v1/data/acp/decision" },
  otel: { enabled: false, otlpEndpoint: "http://otel-collector:4318", serviceName: "acp-gateway" },
}));
```

## Bootstrapping gateway

```ts
import { createGateway } from "@acp/gateway";
import config from "./acp.config.js";

const gateway = await createGateway(config, { cwd: process.cwd() });
await gateway.start();
```

> NOTE
> `basePath` prefixes routes like `/approvals/:id` and `/healthz`.

> WARNING
> In MVP proxy mode, missing `x-acp-upstream-url` causes request failure.
