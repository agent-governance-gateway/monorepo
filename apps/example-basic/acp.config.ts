import { defineConfig } from "@acp/config";
import { getApprovalsDbUrl } from "@acp/env";

const approvalsDbUrl = getApprovalsDbUrl();

export default defineConfig(() => ({
  gateway: {
    port: 3100,
  },
  tools: { dir: "./tools" },
  principals: { dir: "./principals" },
  approvals: { dir: "./approvals" },
  sinks: { dir: "./sinks" },
  routing: {
    defaultAction: { type: "passThrough" },
    rules: [
      {
        match: { method: "DELETE" },
        action: { type: "deny", reason: "delete_is_forbidden" },
      },
      {
        match: { method: "POST", env: "prod" },
        action: { type: "requireApproval", handler: "webhook", ttlMs: 300000 },
      },
    ],
  },
  approvalsRuntime: approvalsDbUrl
    ? {
        store: {
          type: "postgres" as const,
          url: approvalsDbUrl,
        },
        defaultHandlerId: "webhook",
      }
    : undefined,
  audit: {
    sinks: ["stdout"],
  },
  opa: {
    enabled: false,
    url: "http://localhost:8181/v1/data/acp/allow",
  },
  otel: {
    enabled: false,
    otlpEndpoint: "http://localhost:4318",
    serviceName: "acp-example-gateway",
  },
}));
