import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { type ApprovalTask, type AuditEvent, type CanonicalAction, type Principal, type ToolAfterRequestMeta } from "@acp/core";
import { approvalTasksTable } from "./schema/approvals.js";
import { auditEventsTable } from "./schema/audit.js";
import { costEventsTable } from "./schema/costs.js";
import { requestsTable } from "./schema/requests.js";

export type RequestRecordInput = {
  id: string;
  ts: Date;
  principalKey: string;
  principal: Principal;
  channel: CanonicalAction["channel"];
  request: CanonicalAction["request"];
  target: CanonicalAction["target"];
  metadata?: Record<string, unknown>;
};

export type CostEventInput = {
  requestId: string;
  ts: Date;
  cost?: ToolAfterRequestMeta["cost"];
  reason?: string;
  metadata?: ToolAfterRequestMeta["metadata"];
  upstreamStatus?: number;
  latencyMs?: number;
};

export type ACPDatabase = {
  client: Client;
  db: ReturnType<typeof drizzle>;
  connect: () => Promise<void>;
  close: () => Promise<void>;
  runMigrations: (migrationsFolder: string) => Promise<void>;
  insertRequestRecord: (record: RequestRecordInput) => Promise<void>;
  createApprovalTask: (task: ApprovalTask) => Promise<void>;
  getApprovalTask: (id: string) => Promise<ApprovalTask | null>;
  setApprovalDecision: (
    id: string,
    decision: { status: "approved" | "denied"; decidedBy?: string; decisionReason?: string },
  ) => Promise<void>;
  markApprovalConsumed: (id: string, consumedBy: string) => Promise<void>;
  insertAuditEvent: (event: AuditEvent, requestId?: string) => Promise<void>;
  insertCostEvent: (event: CostEventInput) => Promise<void>;
};

function mapApprovalTaskRow(row: typeof approvalTasksTable.$inferSelect): ApprovalTask {
  return {
    id: row.id,
    requestId: row.requestId ?? undefined,
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
    insertRequestRecord: async (record) => {
      await db.insert(requestsTable).values({
        id: record.id,
        ts: record.ts,
        principalKey: record.principalKey,
        tenantId: record.principal.tenantId,
        env: record.principal.env,
        agentId: record.principal.agentId,
        serviceId: record.principal.serviceId,
        userId: record.principal.userId,
        workflowId: record.principal.workflowId,
        executionId: record.principal.executionId,
        runId: record.principal.runId,
        channel: record.channel,
        method: record.request.method,
        host: record.request.host,
        path: record.request.path,
        approvalBind: record.target.approvalBind,
        tool: record.target.tool,
        action: record.target.action,
        resource: record.target.resource,
        metadata: record.metadata,
      });
    },
    createApprovalTask: async (task) => {
      await db.insert(approvalTasksTable).values({
        id: task.id,
        requestId: task.requestId,
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
    insertAuditEvent: async (event, requestId) => {
      await db.insert(auditEventsTable).values({
        requestId,
        kind: event.kind,
        payload: event,
      });
    },
    insertCostEvent: async (event) => {
      await db.insert(costEventsTable).values({
        requestId: event.requestId,
        ts: event.ts,
        costAmount: event.cost?.amount,
        costCurrency: event.cost?.currency ?? "USD",
        reason: event.reason,
        upstreamStatus: event.upstreamStatus,
        latencyMs: event.latencyMs,
        metadata: event.metadata,
      });
    },
  };
}
