/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "default",
  resolve: (ctx) => {
    const env = typeof ctx.headers["x-env"] === "string" ? ctx.headers["x-env"] : "dev";
    const agentId = typeof ctx.headers["x-agent-id"] === "string" ? ctx.headers["x-agent-id"] : "agent-unknown";
    const tenantId = typeof ctx.headers["x-tenant-id"] === "string" ? ctx.headers["x-tenant-id"] : "tenant-a";
    return { env, agentId, tenantId };
  },
});
