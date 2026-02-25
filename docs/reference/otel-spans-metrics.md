# OpenTelemetry Spans and Metrics Reference

These names come from gateway runtime code.

## Spans

- `acp.request`
- `acp.policy`
- `acp.approval`
- `acp.upstream`

## Span attributes added

- `acp.agent_id`
- `acp.env`
- `acp.tenant_id`

## Metrics

Counters:
- `acp.request.count`
- `acp.error.count`
- `acp.denied.count`
- `acp.approval_required.count`
- `acp.executed.count`

Histogram:
- `acp.upstream.latency_ms`

## Enablement

```ts
otel: {
  enabled: true,
  otlpEndpoint: "http://localhost:4318",
  serviceName: "acp-gateway",
}
```

If disabled, telemetry is no-op.

## Next steps

- [Enable OTel how-to](../how-to/otel-enable.md)
- [Architecture explanation](../explanation/architecture.md)
