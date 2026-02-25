import { defineConfig } from "@acp/config";
import { getGatewayPort, getStoreType, getStoreUrl } from "@acp/env";

const storeUrl = getStoreUrl();
const storeType = getStoreType();
if (storeType === "postgres" && !storeUrl) {
  throw new Error("STORE_URL (or DATABASE_URL/DB_URL) is required when STORE_TYPE=postgres");
}

export default defineConfig(() => ({
  gateway: {
    port: getGatewayPort(),
  },
  tools: { dir: "./tools" },
  principals: { dir: "./principals" },
  approvals: { dir: "./approvals" },
  sinks: { dir: "./sinks" },
  routing: {
    // Keep this for demo DX. Everything passes unless it matches a rule below.
    defaultAction: { type: "passThrough" },
    // Example strict mode (no pass-through):
    // defaultAction: { type: "deny", reason: "default_deny" },
    rules: [
      {
        match: { agentId: "unauthorized" },
        action: { type: "deny", reason: "invalid_api_key" },
      },
      {
        match: { method: "DELETE" },
        action: { type: "deny", reason: "delete_is_forbidden" },
      },
      { match: { method: "POST", env: "prod" }, action: { type: "requireApproval", handler: "manual", ttlMs: 300000 } },
      { match: { method: "PUT", env: "prod" }, action: { type: "requireApproval", handler: "manual", ttlMs: 300000 } },
      { match: { method: "PATCH", env: "prod" }, action: { type: "requireApproval", handler: "manual", ttlMs: 300000 } },

      // Slack/OpenAI strict examples (uncomment when using default deny):
      // { match: { tool: "openai", action: "chat.completions" }, action: { type: "passThrough" } },
      // { match: { tool: "openai", action: "unknown" }, action: { type: "deny", reason: "unsupported_openai_action" } },
      // { match: { tool: "slack", action: "chat.postMessage" }, action: { type: "requireApproval", handler: "manual", ttlMs: 120000 } },
      // { match: { tool: "slack", action: "unknown" }, action: { type: "deny", reason: "unsupported_slack_action" } },
    ],
  },
  store: storeType === "postgres" && storeUrl
    ? {
        type: "postgres" as const,
        connection: { url: storeUrl },
      }
    : { type: "memory" as const },
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
