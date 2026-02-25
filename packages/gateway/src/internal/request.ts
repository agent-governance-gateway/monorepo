import {
  INTERNAL_HEADERS,
  REDACTED_HEADERS,
  type CanonicalAction,
  type Principal,
  type PrincipalResolver,
  type RequestContext,
  type ToolPack,
} from "@acp/core";
import type { FastifyRequest } from "fastify";
import { builtInTools } from "@acp/tools";
import { normalizeIncomingHeaders, redactSensitiveHeaders } from "@acp/utils";

export function getBodyBuffer(req: FastifyRequest): Buffer {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    return Buffer.from(req.body);
  }
  if (req.body && typeof req.body === "object") {
    return Buffer.from(JSON.stringify(req.body));
  }
  return Buffer.alloc(0);
}

export function buildRequestContext(req: FastifyRequest): RequestContext {
  const host = typeof req.headers.host === "string" ? req.headers.host.split(":")[0] : "unknown";
  return {
    channel: "http",
    method: req.method.toUpperCase(),
    host,
    path: req.url.split("?")[0] ?? "/",
    headers: normalizeIncomingHeaders(req.headers as Record<string, unknown>),
    ip: req.ip,
  };
}

export function buildMcpRequestContext(req: FastifyRequest): RequestContext {
  const base = buildRequestContext(req);
  const mcpMethod = extractMcpMethod(req.body);
  return {
    ...base,
    channel: "mcp",
    method: "POST",
    path: mcpMethod ? `/mcp/${mcpMethod}` : "/mcp/unknown",
  };
}

export function chooseTool(tools: ToolPack[], ctx: RequestContext): ToolPack {
  const requestedToolId = typeof ctx.headers[INTERNAL_HEADERS.TOOL_ID] === "string"
    ? (ctx.headers[INTERNAL_HEADERS.TOOL_ID] as string)
    : undefined;

  if (requestedToolId) {
    for (const tool of tools) {
      if (!tool.match && tool.id === requestedToolId) {
        return tool;
      }
    }
  }

  for (const tool of tools) {
    if (tool.match?.(ctx)) {
      return tool;
    }
  }
  return builtInTools[builtInTools.length - 1];
}

export function buildCanonical(
  ctx: RequestContext,
  principal: Principal,
  normalized: CanonicalAction["target"],
  body: Buffer,
): CanonicalAction {
  return {
    principal,
    channel: ctx.channel,
    request: {
      method: ctx.method,
      host: ctx.host,
      path: ctx.path,
      contentType: typeof ctx.headers["content-type"] === "string" ? ctx.headers["content-type"] : undefined,
      bodySize: body.byteLength,
    },
    target: normalized,
    meta: {
      requestHeaders: redactSensitiveHeaders(ctx.headers, REDACTED_HEADERS),
    },
  };
}

export async function resolvePrincipal(resolvers: PrincipalResolver[], ctx: RequestContext): Promise<Principal> {
  const principal: Principal = {};
  for (const resolver of resolvers) {
    const next = await resolver.resolve(ctx);
    if (next) {
      Object.assign(principal, next);
    }
  }
  return principal;
}

function extractMcpMethod(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }
  const method = (body as Record<string, unknown>).method;
  return typeof method === "string" && method.trim().length > 0 ? method : undefined;
}
