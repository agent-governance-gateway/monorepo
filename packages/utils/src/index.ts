export function normalizeIncomingHeaders(
  headers: Record<string, unknown>,
): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === "string" || Array.isArray(v) || v === undefined) {
      out[k.toLowerCase()] = v;
    } else if (typeof v === "number") {
      out[k.toLowerCase()] = String(v);
    }
  }
  return out;
}

export function redactSensitiveHeaders(
  headers: Record<string, string | string[] | undefined>,
  redactedSet: ReadonlySet<string>,
): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = redactedSet.has(k.toLowerCase()) ? "***REDACTED***" : v;
  }
  return out;
}

export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

export function safeTimingEqualHex(expected: string, provided: string | undefined): boolean {
  if (!provided || provided.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
import crypto from "node:crypto";
