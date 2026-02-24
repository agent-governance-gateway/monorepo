import { createDatabase, type ACPDatabase } from "@acp/db";
import type { AuditEvent, AuditSink } from "@acp/core";

export type { AuditEvent, AuditSink } from "@acp/core";

export function defineSink(sink: AuditSink): AuditSink {
  return sink;
}

export const stdoutJsonSink: AuditSink = {
  id: "stdout-json",
  async write(event: AuditEvent): Promise<void> {
    console.log(JSON.stringify(event));
  },
};

export class PostgresJsonbSink implements AuditSink {
  public readonly id: string;
  private readonly database: ACPDatabase;
  private readonly autoMigrate: boolean;
  private readonly migrationsFolder?: string;

  constructor(config: { url: string; id?: string; autoMigrate?: boolean; migrationsFolder?: string }) {
    this.id = config.id ?? "postgres-jsonb";
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

  async write(event: AuditEvent): Promise<void> {
    await this.database.insertAuditEvent(event);
  }

  async flush(): Promise<void> {
    return;
  }

  async close(): Promise<void> {
    await this.database.close();
  }
}
