/// <reference types="@acp/config/globals" />

export default defineTool({
  id: "slack",
  match: (ctx) => ctx.host.endsWith("slack.com"),
  normalize: (ctx) => ({
    tool: "slack",
    action: ctx.path.includes("chat.postMessage") ? "chat.postMessage" : "unknown",
    resource: ctx.host,
    approvalBind: `slack:${ctx.method}:${ctx.path}`,
  }),
});
