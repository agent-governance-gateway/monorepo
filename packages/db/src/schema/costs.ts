import { bigserial, doublePrecision, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const costEventsTable = pgTable("acp_cost_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  requestId: uuid("request_id"),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  costAmount: doublePrecision("cost_amount"),
  costCurrency: text("cost_currency"),
  reason: text("reason"),
  upstreamStatus: doublePrecision("upstream_status"),
  latencyMs: doublePrecision("latency_ms"),
  metadata: jsonb("metadata"),
});
