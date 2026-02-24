/// <reference types="@acp/config/globals" />

export default defineTool({
  id: "openai",
  match: (ctx) => ctx.path.includes("/v1/") || ctx.host.includes("openai"),
  normalize: (ctx) => ({
    tool: "openai",
    action: ctx.path.includes("chat/completions") ? "chat.completions" : "unknown",
    resource: ctx.host,
    approvalBind: `openai:${ctx.method}:${ctx.host}:${ctx.path}`,
  }),
});
