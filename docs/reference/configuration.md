# Configuration Reference

This page documents `ACPConfig` from `@acp/core`.

## Top-level shape

```ts
type ACPConfig = {
  routing: RoutingConfig;
  tools?: { dir: string };
  principals?: { dir: string };
  approvals?: { dir: string };
  sinks?: { dir: string };
  gateway: {
    port: number;
    basePath?: string;
  };
  store: { type: "memory" } | { type: "postgres"; connection: { url: string } };
  audit?: { sinks: string[] };
  opa?: { enabled: boolean; url: string };
  otel?: { enabled: boolean; otlpEndpoint: string; serviceName?: string };
  telemetry?: { enabled: boolean; endpoint: string; intervalHours?: number };
};
```

## Required fields

- `gateway.port`
- `routing.defaultAction`
- `routing.rules`
- `store`

## Routing

```ts
type RouteAction =
  | { type: "passThrough" }
  | { type: "deny"; reason: string }
  | { type: "enforcePolicy" }
  | { type: "requireApproval"; handler: string; ttlMs?: number };
```

```ts
type Match = Partial<{
  channel: "http" | "mcp" | "egress";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  host: string | RegExp;
  path: string | RegExp;
  tool: string;
  action: string;
  resource: string | RegExp;
  agentId: string;
  env: string;
}>;
```

## Plugin auto-discovery directories

- `tools.dir`
- `principals.dir`
- `approvals.dir`
- `sinks.dir`

Gateway loads all default exports from these directories.

## Store

- `memory`: in-memory approval state.
- `postgres`: persistent control-plane state (`requests`, `approvals`, `audit`, `costs`).

## Environment variables

From `@acp/env`:

- `STORE_TYPE` (`memory` | `postgres`)
- `STORE_URL`
- `DATABASE_URL` (alias for store URL)
- `DB_URL` (alias for store URL)
- `APPROVALS_STORE` (deprecated alias)
- `APPROVALS_DB_URL` (deprecated alias)
- `GATEWAY_PORT`
- `APPROVER_WEBHOOK_URL`
- `ACP_TEST_AUDIT_FILE` (tests)

## Deprecation notes

Deprecated getters still exist for compatibility:
- `getApprovalsStoreType()` -> use `getStoreType()`
- `getApprovalsDbUrl()` -> use `getStoreUrl()`

## Next steps

- [Headers reference](./headers.md)
- [Plugin interfaces](./plugins.md)
