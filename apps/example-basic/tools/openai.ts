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
  afterRequest: ({ upstream }) => {
    if (upstream.status >= 400) {
      return;
    }
    const parsed = safeParseJson(upstream.body);
    if (!parsed || typeof parsed !== "object") {
      return;
    }
    const usageObj = getObjectField(parsed, "usage");
    if (!usageObj) {
      return;
    }

    const promptTokens = getNumberField(usageObj, "prompt_tokens");
    const completionTokens = getNumberField(usageObj, "completion_tokens");
    const totalTokens = getNumberField(usageObj, "total_tokens");
    const model = getStringField(parsed, "model");
    const pricing = getModelPricing(model);
    const cost = estimateOpenAICostUsd(pricing, promptTokens, completionTokens);

    return {
      cost,
      reason: "token_pricing",
      metadata: {
        provider: "openai",
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        pricePerMillionInputUsd: pricing?.input,
        pricePerMillionOutputUsd: pricing?.output,
        upstreamStatus: upstream.status,
      },
    };
  },
});

function safeParseJson(raw: Buffer): unknown {
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    return undefined;
  }
}

function getObjectField(input: unknown, key: string): Record<string, unknown> | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  const value = (input as Record<string, unknown>)[key];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function getNumberField(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  return typeof value === "number" ? value : undefined;
}

function getStringField(input: unknown, key: string): string | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  const value = (input as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function estimateOpenAICostUsd(
  pricing: { input: number; output: number } | undefined,
  promptTokens?: number,
  completionTokens?: number,
): number | undefined {
  if (!pricing || promptTokens === undefined || completionTokens === undefined) {
    return undefined;
  }
  const promptCost = (promptTokens / 1_000_000) * pricing.input;
  const completionCost = (completionTokens / 1_000_000) * pricing.output;
  return Number((promptCost + completionCost).toFixed(8));
}

function getModelPricing(model: string | undefined): { input: number; output: number } | undefined {
  if (!model) {
    return undefined;
  }
  return MODEL_PRICING_USD_PER_1M[model];
}

const MODEL_PRICING_USD_PER_1M: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 5, output: 15 },
};
