import type {
  ACPConfig,
  ApprovalHandler,
  AuditSink,
  PrincipalResolver,
  ToolPack,
} from "@acp/core";

export type ConfigFactoryContext = {
  cwd: string;
};

export type ConfigFactory = (ctx: ConfigFactoryContext) => ACPConfig;

export function defineConfig(factory: ConfigFactory): ConfigFactory {
  return factory;
}

export function defineTool(tool: ToolPack): ToolPack {
  return tool;
}

export function defineSink(sink: AuditSink): AuditSink {
  return sink;
}

export function defineApprovalHandler(handler: ApprovalHandler): ApprovalHandler {
  return handler;
}

export function definePrincipalResolver(resolver: PrincipalResolver): PrincipalResolver {
  return resolver;
}

function setGlobal(name: string, value: unknown): void {
  const g = globalThis as Record<string, unknown>;
  if (!g[name]) {
    g[name] = value;
  }
}

export function installGlobals(): void {
  setGlobal("defineTool", defineTool);
  setGlobal("defineSink", defineSink);
  setGlobal("defineApprovalHandler", defineApprovalHandler);
  setGlobal("definePrincipalResolver", definePrincipalResolver);
}

export type { ACPConfig } from "@acp/core";
