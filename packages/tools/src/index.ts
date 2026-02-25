import type { RequestContext, ToolPack } from "@acp/core";

export function defineTool(tool: ToolPack): ToolPack {
  return tool;
}

export const genericHttpTool: ToolPack = {
  id: "generic-http",
  match: () => true,
  normalize: (ctx) => ({
    tool: "generic-http",
    action: `${ctx.method.toUpperCase()} ${ctx.path}`,
    resource: ctx.host,
    approvalBind: `http:${ctx.method.toUpperCase()}:${ctx.host}:${ctx.path}`,
  }),
};

export const genericMcpTool: ToolPack = {
  id: "generic-mcp",
  match: (ctx) => ctx.channel === "mcp",
  normalize: (ctx) => {
    const action = ctx.path.startsWith("/mcp/") ? ctx.path.slice("/mcp/".length) : "unknown";
    return {
      tool: "mcp",
      action: action || "unknown",
      resource: ctx.host,
      approvalBind: `mcp:${ctx.host}:${action || "unknown"}`,
    };
  },
};

function extractOpenAIAction(path: string): string {
  if (path.includes("/chat/completions")) {
    return "chat.completions";
  }
  if (path.includes("/responses")) {
    return "responses.create";
  }
  if (path.includes("/embeddings")) {
    return "embeddings.create";
  }
  return "unknown";
}

export const openaiLikeTool: ToolPack = {
  id: "openai-like",
  match: (ctx: RequestContext) => {
    return /openai|anthropic|together|groq|fireworks|inference|llm/i.test(ctx.host);
  },
  normalize: (ctx) => ({
    tool: "openai-like",
    action: extractOpenAIAction(ctx.path),
    resource: ctx.host,
    approvalBind: `openai-like:${ctx.method.toUpperCase()}:${ctx.host}:${ctx.path}`,
  }),
};

export const builtInTools: ToolPack[] = [genericMcpTool, openaiLikeTool, genericHttpTool];

export type { ToolPack } from "@acp/core";
