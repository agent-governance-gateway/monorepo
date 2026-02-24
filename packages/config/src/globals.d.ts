import type { ApprovalHandler, AuditSink, PrincipalResolver, ToolPack } from "@acp/core";

declare global {
  var defineTool: (tool: ToolPack) => ToolPack;
  var defineSink: (sink: AuditSink) => AuditSink;
  var defineApprovalHandler: (handler: ApprovalHandler) => ApprovalHandler;
  var definePrincipalResolver: (resolver: PrincipalResolver) => PrincipalResolver;
}

export {};
