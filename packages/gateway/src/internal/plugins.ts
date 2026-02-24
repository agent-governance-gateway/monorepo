import path from "node:path";
import fg from "fast-glob";
import { installGlobals } from "@acp/config";
import type { ACPConfig, ApprovalHandler, AuditSink, PrincipalResolver, ToolPack } from "@acp/core";
import { noopApprovalHandler } from "@acp/approvals";
import { stdoutJsonSink } from "@acp/audit";
import { builtInTools } from "@acp/tools";

export type LoadedPlugins = {
  tools: ToolPack[];
  principals: PrincipalResolver[];
  approvals: ApprovalHandler[];
  sinks: AuditSink[];
};

export async function loadDefaultExports<T>(cwd: string, dir?: string): Promise<T[]> {
  if (!dir) {
    return [];
  }

  installGlobals();
  const absDir = path.resolve(cwd, dir);
  const files = await fg(["**/*.ts", "**/*.js", "**/*.mts", "**/*.mjs", "**/*.cts", "**/*.cjs"], {
    cwd: absDir,
    absolute: true,
    onlyFiles: true,
  });

  files.sort();
  const out: T[] = [];
  for (const file of files) {
    const mod = (await import(file)) as { default?: T };
    if (mod.default) {
      out.push(mod.default);
    }
  }
  return out;
}

export async function loadPlugins(config: ACPConfig, cwd: string): Promise<LoadedPlugins> {
  const [tools, principals, approvals, sinks] = await Promise.all([
    loadDefaultExports<ToolPack>(cwd, config.tools?.dir),
    loadDefaultExports<PrincipalResolver>(cwd, config.principals?.dir),
    loadDefaultExports<ApprovalHandler>(cwd, config.approvals?.dir),
    loadDefaultExports<AuditSink>(cwd, config.sinks?.dir),
  ]);

  return {
    tools: [...tools, ...builtInTools],
    principals,
    approvals: [noopApprovalHandler, ...approvals],
    sinks: sinks.length ? sinks : [stdoutJsonSink],
  };
}
