/// <reference types="@acp/config/globals" />

export default defineTool({
  id: "demo-httpbin",
  resolveUpstream: (ctx) => `https://httpbin.org${ctx.path}`,
  normalize: (ctx) => ({
    tool: "demo-httpbin",
    action: `${ctx.method} ${ctx.path}`,
    resource: "httpbin.org",
    approvalBind: `demo-httpbin:${ctx.method}:${ctx.path}`,
  }),
});
