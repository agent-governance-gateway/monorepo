# Observability

ACP provides two observability layers:
- Audit events for governance trail.
- OpenTelemetry for performance/reliability signals.

## Audit Events

Common event kinds:
- `request`
- `approval_required`
- `approval_decided`
- `executed`
- `error`

Each event includes canonical context and outcome metadata.

### Example sink config

```ts
audit: {
  sinks: ["stdout"],
}
```

### Example event (shape)

```json
{
  "ts": "2026-01-01T00:00:00.000Z",
  "kind": "executed",
  "canonical": {
    "principal": { "env": "prod", "agentId": "agent-demo" },
    "channel": "http",
    "request": { "method": "POST", "host": "gateway", "path": "/invoke", "bodySize": 18 },
    "target": { "tool": "openai", "action": "chat.completions" }
  },
  "outcome": {
    "status": "executed",
    "upstreamStatus": 200,
    "latencyMs": 42
  }
}
```

## OpenTelemetry

Built in, disabled by default.

Enable in config:

```ts
otel: {
  enabled: true,
  otlpEndpoint: "http://localhost:4318",
  serviceName: "acp-gateway",
}
```

### Spans

- `acp.request`
- `acp.policy`
- `acp.approval`
- `acp.upstream`

### Metrics

- request/error counters
- approval required counter
- executed counter
- upstream latency histogram

## Example: Tempo / Grafana

```ts
otel: {
  enabled: true,
  otlpEndpoint: "http://tempo:4318",
  serviceName: "acp-gateway",
}
```

## Example: Jaeger (via OTLP collector)

```ts
otel: {
  enabled: true,
  otlpEndpoint: "http://otel-collector:4318",
  serviceName: "acp-gateway",
}
```

## Operational Guidance

- Start with audit first.
- Enable OTel when you need latency and failure attribution.
- Avoid adding payload/secrets as span attributes.
