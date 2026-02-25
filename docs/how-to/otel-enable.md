# How to enable OpenTelemetry

## Config

```ts
otel: {
  enabled: true,
  otlpEndpoint: "http://localhost:4318",
  serviceName: "acp-gateway",
},
```

## Request example

```bash
curl -i -X POST http://localhost:3100/post \
  -H 'x-acp-tool-id: demo-httpbin' \
  -H 'x-api-key: demo-dev-agent-key' \
  -H 'content-type: application/json' \
  -d '{"hello":"telemetry"}'
```

Expected: request succeeds and telemetry exporter sends spans/metrics to OTLP endpoint.

## What to look for

Spans:
- `acp.request`
- `acp.policy`
- `acp.approval`
- `acp.upstream`

Metrics:
- `acp.request.count`
- `acp.error.count`
- `acp.denied.count`
- `acp.approval_required.count`
- `acp.executed.count`
- `acp.upstream.latency_ms`

## Next steps

- [OpenTelemetry reference](../reference/otel-spans-metrics.md)
- [Observability explanation](../explanation/architecture.md)
