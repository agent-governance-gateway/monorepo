import { bigserial, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const auditEventsTable = pgTable("acp_audit_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").notNull(),
});
