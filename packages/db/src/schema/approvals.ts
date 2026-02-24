import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const approvalTasksTable = pgTable("acp_approval_tasks", {
  id: varchar("id", { length: 128 }).primaryKey(),
  status: varchar("status", { length: 24 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  principalKey: text("principal_key").notNull(),
  method: varchar("method", { length: 16 }).notNull(),
  host: text("host").notNull(),
  path: text("path").notNull(),
  approvalBind: text("approval_bind"),
  reason: text("reason"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: text("decided_by"),
  decisionReason: text("decision_reason"),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  consumedBy: text("consumed_by"),
});
