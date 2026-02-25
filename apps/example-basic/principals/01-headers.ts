/// <reference types="@acp/config/globals" />

const AGENT_KEYS: Record<string, {
  agentId: string;
  tenantId: string;
  env: "dev" | "staging" | "prod";
}> = {
  "demo-prod-agent-key": {
    agentId: "agent-demo",
    tenantId: "tenant-demo",
    env: "prod",
  },
  "demo-dev-agent-key": {
    agentId: "agent-dev",
    tenantId: "tenant-demo",
    env: "dev",
  },
};

export default definePrincipalResolver({
  id: "api-key",
  resolve: (ctx) => {
    const apiKey = typeof ctx.headers["x-api-key"] === "string" ? ctx.headers["x-api-key"] : undefined;
    const mapped = apiKey ? AGENT_KEYS[apiKey] : undefined;
    if (!mapped) {
      return { agentId: "unauthorized", tenantId: "unauthorized", env: "dev" };
    }

    const workflowId = typeof ctx.headers["x-workflow-id"] === "string" ? ctx.headers["x-workflow-id"] : undefined;
    const executionId = typeof ctx.headers["x-execution-id"] === "string" ? ctx.headers["x-execution-id"] : undefined;
    const runId = typeof ctx.headers["x-run-id"] === "string" ? ctx.headers["x-run-id"] : undefined;
    return {
      env: mapped.env,
      agentId: mapped.agentId,
      tenantId: mapped.tenantId,
      workflowId,
      executionId,
      runId,
    };
  },
});
