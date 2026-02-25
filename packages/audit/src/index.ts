import type { AuditEvent, AuditSink } from "@acp/core";

export type { AuditEvent, AuditSink } from "@acp/core";

export function defineSink(sink: AuditSink): AuditSink {
  return sink;
}

export const stdoutJsonSink: AuditSink = {
  id: "stdout-json",
  async write(event: AuditEvent): Promise<void> {
    const level = toLogLevel(event);
    console.log(JSON.stringify({ level, type: "acp_audit", event }));
  },
};

function toLogLevel(event: AuditEvent): "debug" | "info" | "warn" | "error" {
  if (event.kind === "error") {
    return "error";
  }
  if (event.kind === "approval_required") {
    return "warn";
  }
  if (event.kind === "request") {
    return "debug";
  }
  return "info";
}
