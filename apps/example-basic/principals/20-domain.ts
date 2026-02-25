/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "domain-agent",
  resolve: (ctx) => {
    if (!ctx.host.endsWith(".agents.local")) {
      return null;
    }
    const agentId = ctx.host.replace(".agents.local", "");
    return { agentId };
  },
});
