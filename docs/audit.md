# Audit

Audit events are emitted by gateway on every major lifecycle step.

## Event kinds in code

- `request`
- `approval_required`
- `approval_decided`
- `executed`
- `error`

## Where events go

Configured sinks (`audit.sinks`):
- built-in `stdout-json` sink
- optional Postgres sink (`PostgresJsonbSink`)
- custom sinks via `sinks/*.ts`

## Example sink config

```ts
audit: { sinks: ["stdout"] }
```

## Example event shape

```json
{
  "ts": "2026-01-01T00:00:00.000Z",
  "kind": "approval_required",
  "canonical": {
    "principal": { "tenantId": "tenant-a", "env": "prod", "agentId": "agent-demo" },
    "channel": "http",
    "request": { "method": "POST", "host": "localhost", "path": "/invoke", "bodySize": 18 },
    "target": { "tool": "openai", "action": "chat.completions" }
  },
  "outcome": { "status": "approval_required", "reason": "webhook" }
}
```

## Security defaults

- Sensitive headers are redacted from canonical metadata (`authorization`, `cookie`, `set-cookie`, etc.).
- Body content is not logged by default (only size).

## Postgres sink example

```ts
/// <reference types="@acp/config/globals" />
import { PostgresJsonbSink } from "@acp/audit";

const sink = new PostgresJsonbSink({
  id: "postgres",
  url: "postgres://postgres:postgres@localhost:5432/postgres",
});
await sink.connect();

export default defineSink(sink);
```
