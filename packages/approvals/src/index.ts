import crypto from "node:crypto";
import { createDatabase, type ACPDatabase } from "@acp/db";
import type { ApprovalHandler, ApprovalRequestPayload, ApprovalStore, ApprovalTask } from "@acp/core";

export type { ApprovalStore, ApprovalTask, ApprovalHandler, ApprovalRequestPayload } from "@acp/core";

export function defineApprovalHandler(handler: ApprovalHandler): ApprovalHandler {
  return handler;
}

export class PostgresApprovalStore implements ApprovalStore {
  private readonly database: ACPDatabase;
  private readonly ownsDatabase: boolean;
  private readonly autoMigrate: boolean;
  private readonly migrationsFolder?: string;

  constructor(config: { url: string; autoMigrate?: boolean; migrationsFolder?: string } | {
    database: ACPDatabase;
    autoMigrate?: boolean;
    migrationsFolder?: string;
  }) {
    if ("database" in config) {
      this.database = config.database;
      this.ownsDatabase = false;
    } else {
      this.database = createDatabase(config.url);
      this.ownsDatabase = true;
    }
    this.autoMigrate = config.autoMigrate ?? false;
    this.migrationsFolder = config.migrationsFolder;
  }

  async connect(): Promise<void> {
    if (this.ownsDatabase) {
      await this.database.connect();
    }
    if (this.autoMigrate && this.migrationsFolder) {
      await this.database.runMigrations(this.migrationsFolder);
    }
  }

  async close(): Promise<void> {
    if (this.ownsDatabase) {
      await this.database.close();
    }
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

export class InMemoryApprovalStore implements ApprovalStore {
  private readonly map = new Map<string, ApprovalTask>();

  async create(task: ApprovalTask): Promise<void> {
    this.map.set(task.id, { ...task });
  }

  async get(id: string): Promise<ApprovalTask | null> {
    return this.map.get(id) ?? null;
  }

  async setDecision(
    id: string,
    decision: { status: "approved" | "denied"; decidedBy?: string; decisionReason?: string },
  ): Promise<void> {
    const current = this.map.get(id);
    if (!current) {
      return;
    }
    this.map.set(id, {
      ...current,
      status: decision.status,
      decidedBy: decision.decidedBy,
      decisionReason: decision.decisionReason,
      decidedAt: new Date(),
    });
  }

  async markConsumed(id: string, consumedBy: string): Promise<void> {
    const current = this.map.get(id);
    if (!current) {
      return;
    }
    this.map.set(id, {
      ...current,
      status: "consumed",
      consumedAt: new Date(),
      consumedBy,
    });
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
