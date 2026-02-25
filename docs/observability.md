# Observability (OpenTelemetry)

OpenTelemetry is built in and disabled by default.

## Enable OTel

```ts
otel: {
  enabled: true,
  otlpEndpoint: "http://otel-collector:4318",
  serviceName: "acp-gateway",
}
```

## Spans in code

- `acp.request`
- `acp.policy`
- `acp.approval`
- `acp.upstream`

## Metrics in code

Counters/histograms are emitted with names used by gateway runtime:
- `acp.request.count`
- `acp.error.count`
- `acp.denied.count`
- `acp.approval_required.count`
- `acp.executed.count`
- `acp.upstream.latency_ms` (histogram-like recording)

## Safe attributes

Current instrumentation adds principal-safe metadata like:
- `acp.agent_id`
- `acp.env`
- `acp.tenant_id`

No payload bodies are sent as attributes.

## Tempo / Jaeger examples

### Tempo (OTLP HTTP)

```ts
otel: {
  enabled: true,
  otlpEndpoint: "http://tempo:4318",
  serviceName: "acp-gateway",
}
```

### Jaeger via collector

```ts
otel: {
  enabled: true,
  otlpEndpoint: "http://otel-collector:4318",
  serviceName: "acp-gateway",
}
```

> NOTE
> If OTel is disabled, telemetry module is no-op and does not require collector availability.
