import type { AuditEvent, AuditSink } from "@acp/core";

export async function emitAudit(sinks: AuditSink[], event: AuditEvent): Promise<void> {
  await Promise.allSettled(sinks.map(async (sink) => sink.write(event)));
}
