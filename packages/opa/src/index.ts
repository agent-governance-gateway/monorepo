import type { CanonicalAction } from "@acp/core";

export type OpaDecision = {
  decision: "allow" | "deny" | "require_approval";
  reason?: string;
};

export type OpaClient = {
  enabled: boolean;
  evaluate(input: CanonicalAction): Promise<OpaDecision>;
};

export function createOpaClient(config?: { enabled: boolean; url: string }): OpaClient {
  if (!config?.enabled) {
    return {
      enabled: false,
      async evaluate(): Promise<OpaDecision> {
        return { decision: "allow" };
      },
    };
  }

  return {
    enabled: true,
    async evaluate(input: CanonicalAction): Promise<OpaDecision> {
      const res = await fetch(config.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) {
        return { decision: "deny", reason: `opa_http_${res.status}` };
      }
      const json = (await res.json()) as { result?: OpaDecision };
      return json.result ?? { decision: "deny", reason: "opa_invalid_response" };
    },
  };
}
