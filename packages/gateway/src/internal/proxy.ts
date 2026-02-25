import { ACPError, INTERNAL_HEADERS } from "@acp/core";
import type { FastifyReply, FastifyRequest } from "fastify";

export async function proxyUpstream(
  req: FastifyRequest,
  reply: FastifyReply,
  body: Buffer,
): Promise<{ status: number; latencyMs: number; headers: Record<string, string>; body: Buffer }> {
  const upstreamUrl = req.headers[INTERNAL_HEADERS.UPSTREAM_URL] as string | undefined;
  if (!upstreamUrl) {
    throw new ACPError("missing_upstream", "X-ACP-Upstream-Url header is required", 400);
  }

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    const lower = key.toLowerCase();
    if (lower.startsWith("x-acp-") || lower === "host" || lower === "content-length") {
      continue;
    }
    if (typeof value === "string") {
      headers[key] = value;
    }
  }

  const started = Date.now();
  const upstreamResponse = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
  });

  reply.status(upstreamResponse.status);
  const responseHeaders: Record<string, string> = {};
  upstreamResponse.headers.forEach((value, key) => {
    reply.header(key, value);
    responseHeaders[key] = value;
  });

  const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
  reply.send(responseBody);
  return {
    status: upstreamResponse.status,
    latencyMs: Date.now() - started,
    headers: responseHeaders,
    body: responseBody,
  };
}
