import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const requestsTable = pgTable("acp_requests", {
  id: uuid("id").primaryKey(),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  principalKey: text("principal_key").notNull(),
  tenantId: text("tenant_id"),
  env: text("env"),
  agentId: text("agent_id"),
  serviceId: text("service_id"),
  userId: text("user_id"),
  workflowId: text("workflow_id"),
  executionId: text("execution_id"),
  runId: text("run_id"),
  channel: text("channel").notNull(),
  method: text("method").notNull(),
  host: text("host").notNull(),
  path: text("path").notNull(),
  approvalBind: text("approval_bind"),
  tool: text("tool"),
  action: text("action"),
  resource: text("resource"),
  metadata: jsonb("metadata"),
});
