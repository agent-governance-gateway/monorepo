import type { Principal } from "@acp/core";

type Span = { end: () => void; setAttribute: (k: string, v: string | number | boolean) => void };

export type Telemetry = {
  enabled: boolean;
  startSpan(name: string): Span;
  incrementCounter(name: string, value?: number): void;
  recordLatency(name: string, ms: number): void;
  annotatePrincipal(span: Span, principal: Principal): void;
  shutdown(): Promise<void>;
};

const noopSpan: Span = {
  end: () => undefined,
  setAttribute: () => undefined,
};

export async function createTelemetry(config?: {
  enabled: boolean;
  otlpEndpoint: string;
  serviceName?: string;
}): Promise<Telemetry> {
  if (!config?.enabled) {
    return {
      enabled: false,
      startSpan: () => noopSpan,
      incrementCounter: () => undefined,
      recordLatency: () => undefined,
      annotatePrincipal: () => undefined,
      shutdown: async () => undefined,
    };
  }

  const sdkNode = (await import("@opentelemetry/sdk-node")) as any;
  const traceExporterMod = (await import("@opentelemetry/exporter-trace-otlp-http")) as any;
  const metricExporterMod = (await import("@opentelemetry/exporter-metrics-otlp-http")) as any;
  const metricsMod = (await import("@opentelemetry/sdk-metrics")) as any;
  const api = (await import("@opentelemetry/api")) as any;

  const metricExporter = new metricExporterMod.OTLPMetricExporter({ url: `${config.otlpEndpoint}/v1/metrics` });
  const traceExporter = new traceExporterMod.OTLPTraceExporter({ url: `${config.otlpEndpoint}/v1/traces` });
  const sdk = new sdkNode.NodeSDK({
    traceExporter,
    metricReader: new metricsMod.PeriodicExportingMetricReader({ exporter: metricExporter }),
  });

  await sdk.start();
  const meter = api.metrics.getMeter(config.serviceName ?? "acp-gateway");
  const tracer = api.trace.getTracer(config.serviceName ?? "acp-gateway");
  const counters = new Map<string, ReturnType<typeof meter.createCounter>>();
  const histograms = new Map<string, ReturnType<typeof meter.createHistogram>>();

  return {
    enabled: true,
    startSpan(name: string): Span {
      const span = tracer.startSpan(name);
      return {
        end: () => span.end(),
        setAttribute: (k, v) => span.setAttribute(k, v),
      };
    },
    incrementCounter(name: string, value = 1): void {
      const current = counters.get(name) ?? meter.createCounter(name);
      counters.set(name, current);
      current.add(value);
    },
    recordLatency(name: string, ms: number): void {
      const current = histograms.get(name) ?? meter.createHistogram(name);
      histograms.set(name, current);
      current.record(ms);
    },
    annotatePrincipal(span: Span, principal: Principal): void {
      if (principal.agentId) span.setAttribute("acp.agent_id", principal.agentId);
      if (principal.env) span.setAttribute("acp.env", principal.env);
      if (principal.tenantId) span.setAttribute("acp.tenant_id", principal.tenantId);
    },
    shutdown: async () => {
      await sdk.shutdown();
    },
  };
}
