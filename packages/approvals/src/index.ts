import crypto from "node:crypto";
import { createDatabase, type ACPDatabase } from "@acp/db";
import type { ApprovalHandler, ApprovalRequestPayload, ApprovalStore, ApprovalTask } from "@acp/core";

export type { ApprovalStore, ApprovalTask, ApprovalHandler, ApprovalRequestPayload } from "@acp/core";

export function defineApprovalHandler(handler: ApprovalHandler): ApprovalHandler {
  return handler;
}

export class PostgresApprovalStore implements ApprovalStore {
  private readonly database: ACPDatabase;
  private readonly autoMigrate: boolean;
  private readonly migrationsFolder?: string;

  constructor(config: { url: string; autoMigrate?: boolean; migrationsFolder?: string }) {
    this.database = createDatabase(config.url);
    this.autoMigrate = config.autoMigrate ?? false;
    this.migrationsFolder = config.migrationsFolder;
  }

  async connect(): Promise<void> {
    await this.database.connect();
    if (this.autoMigrate && this.migrationsFolder) {
      await this.database.runMigrations(this.migrationsFolder);
    }
  }

  async close(): Promise<void> {
    await this.database.close();
  }

  async create(task: ApprovalTask): Promise<void> {
    await this.database.createApprovalTask(task);
  }

  async get(id: string): Promise<ApprovalTask | null> {
    return this.database.getApprovalTask(id);
  }

  async setDecision(
    id: string,
    decision: { status: "approved" | "denied"; decidedBy?: string; decisionReason?: string },
  ): Promise<void> {
    await this.database.setApprovalDecision(id, decision);
  }

  async markConsumed(id: string, consumedBy: string): Promise<void> {
    await this.database.markApprovalConsumed(id, consumedBy);
  }
}

export const noopApprovalHandler: ApprovalHandler = {
  id: "noop",
  async request(): Promise<void> {
    return;
  },
};

export function createWebhookApprovalHandler(config: {
  id?: string;
  url: string;
  sharedSecret?: string;
}): ApprovalHandler {
  return {
    id: config.id ?? "webhook",
    async request(payload: ApprovalRequestPayload): Promise<void> {
      const body = JSON.stringify(payload);
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (config.sharedSecret) {
        const sig = crypto.createHmac("sha256", config.sharedSecret).update(body).digest("hex");
        headers["x-acp-signature"] = sig;
      }
      await fetch(config.url, {
        method: "POST",
        headers,
        body,
      });
    },
  };
}
