import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import type { ApprovalTask, AuditEvent } from "@acp/core";
import { approvalTasksTable } from "./schema/approvals.js";
import { auditEventsTable } from "./schema/audit.js";

export type ACPDatabase = {
  client: Client;
  db: ReturnType<typeof drizzle>;
  connect: () => Promise<void>;
  close: () => Promise<void>;
  runMigrations: (migrationsFolder: string) => Promise<void>;
  createApprovalTask: (task: ApprovalTask) => Promise<void>;
  getApprovalTask: (id: string) => Promise<ApprovalTask | null>;
  setApprovalDecision: (
    id: string,
    decision: { status: "approved" | "denied"; decidedBy?: string; decisionReason?: string },
  ) => Promise<void>;
  markApprovalConsumed: (id: string, consumedBy: string) => Promise<void>;
  insertAuditEvent: (event: AuditEvent) => Promise<void>;
};

function mapApprovalTaskRow(row: typeof approvalTasksTable.$inferSelect): ApprovalTask {
  return {
    id: row.id,
    status: row.status as ApprovalTask["status"],
    createdAt: row.createdAt,
    expiresAt: row.expiresAt ?? undefined,
    principalKey: row.principalKey,
    method: row.method,
    host: row.host,
    path: row.path,
    approvalBind: row.approvalBind ?? undefined,
    reason: row.reason ?? undefined,
    decidedAt: row.decidedAt ?? undefined,
    decidedBy: row.decidedBy ?? undefined,
    decisionReason: row.decisionReason ?? undefined,
    consumedAt: row.consumedAt ?? undefined,
    consumedBy: row.consumedBy ?? undefined,
  };
}

export function createDatabase(url: string): ACPDatabase {
  const client = new Client({ connectionString: url });
  const db = drizzle(client);

  return {
    client,
    db,
    connect: async () => {
      await client.connect();
    },
    close: async () => {
      await client.end();
    },
    runMigrations: async (migrationsFolder: string) => {
      await migrate(db, { migrationsFolder });
    },
    createApprovalTask: async (task) => {
      await db.insert(approvalTasksTable).values({
        id: task.id,
        status: task.status,
        createdAt: task.createdAt,
        expiresAt: task.expiresAt,
        principalKey: task.principalKey,
        method: task.method,
        host: task.host,
        path: task.path,
        approvalBind: task.approvalBind,
        reason: task.reason,
        decidedAt: task.decidedAt,
        decidedBy: task.decidedBy,
        decisionReason: task.decisionReason,
        consumedAt: task.consumedAt,
        consumedBy: task.consumedBy,
      });
    },
    getApprovalTask: async (id) => {
      const rows = await db.select().from(approvalTasksTable).where(eq(approvalTasksTable.id, id)).limit(1);
      const row = rows[0];
      return row ? mapApprovalTaskRow(row) : null;
    },
    setApprovalDecision: async (id, decision) => {
      await db
        .update(approvalTasksTable)
        .set({
          status: decision.status,
          decidedAt: new Date(),
          decidedBy: decision.decidedBy,
          decisionReason: decision.decisionReason,
        })
        .where(eq(approvalTasksTable.id, id));
    },
    markApprovalConsumed: async (id, consumedBy) => {
      await db
        .update(approvalTasksTable)
        .set({
          status: "consumed",
          consumedAt: new Date(),
          consumedBy,
        })
        .where(eq(approvalTasksTable.id, id));
    },
    insertAuditEvent: async (event) => {
      await db.insert(auditEventsTable).values({
        kind: event.kind,
        payload: event,
      });
    },
  };
}
