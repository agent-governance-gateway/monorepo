import { bigserial, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const auditEventsTable = pgTable("acp_audit_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  requestId: uuid("request_id"),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").notNull(),
});
