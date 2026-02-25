export type Principal = {
  tenantId?: string;
  env?: "dev" | "staging" | "prod" | string;
  agentId?: string;
  serviceId?: string;
  runId?: string;
  workflowId?: string;
  executionId?: string;
  userId?: string;
  tags?: Record<string, string>;
};

export type CanonicalAction = {
  principal: Principal;
  channel: "http" | "mcp" | "egress";
  request: {
    method: string;
    host: string;
    path: string;
    query?: Record<string, string | string[]>;
    contentType?: string;
    bodySize?: number;
  };
  target: {
    tool?: string;
    action?: string;
    resource?: string;
    approvalBind?: string;
  };
  meta?: Record<string, unknown>;
};

export type Match = Partial<{
  channel: "http" | "mcp" | "egress";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  host: string | RegExp;
  path: string | RegExp;
  tool: string;
  action: string;
  resource: string | RegExp;
  agentId: string;
  env: string;
}>;

export type RouteAction =
  | { type: "passThrough" }
  | { type: "deny"; reason: string }
  | { type: "enforcePolicy" }
  | { type: "requireApproval"; handler: string; ttlMs?: number };

export type RouteRule = { match: Match; action: RouteAction };

export type RoutingConfig = {
  defaultAction: RouteAction;
  rules: RouteRule[];
};

export type RequestContext = {
  channel: "http" | "mcp" | "egress";
  method: string;
  host: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type ToolPack = {
  id: string;
  match?: (ctx: RequestContext) => boolean;
  resolveUpstream?: (ctx: RequestContext, body?: Buffer) => string | undefined;
  normalize(ctx: RequestContext, body?: Buffer): Partial<{
    tool: string;
    action: string;
    resource: string;
    approvalBind: string;
  }>;
  redact?: {
    headers?: (headers: Record<string, unknown>) => Record<string, unknown>;
    body?: (body: Buffer) => Buffer | null;
  };
  afterRequest?: (
    input: ToolAfterRequestInput,
  ) => Promise<ToolAfterRequestMeta | void> | ToolAfterRequestMeta | void;
};

export type ToolAfterRequestInput = {
  ctx: RequestContext;
  canonical: CanonicalAction;
  requestBody: Buffer;
  upstream: {
    status: number;
    latencyMs: number;
    headers: Record<string, string>;
    body: Buffer;
  };
};

export type ToolAfterRequestMeta = {
  cost?: {
    amount: number;
    currency?: string;
  };
  reason?: string;
  metadata?: JsonObject;
};

export type PrincipalResolver = {
  id: string;
  resolve(ctx: RequestContext): Promise<Partial<Principal> | null> | Partial<Principal> | null;
};

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired" | "consumed";

export type ApprovalTask = {
  id: string;
  requestId?: string;
  status: ApprovalStatus;
  createdAt: Date;
  expiresAt?: Date;
  principalKey: string;
  method: string;
  host: string;
  path: string;
  approvalBind?: string;
  reason?: string;
  decidedAt?: Date;
  decidedBy?: string;
  decisionReason?: string;
  consumedAt?: Date;
  consumedBy?: string;
};

export interface ApprovalStore {
  create(task: ApprovalTask): Promise<void>;
  get(id: string): Promise<ApprovalTask | null>;
  setDecision(
    id: string,
    decision: { status: "approved" | "denied"; decidedBy?: string; decisionReason?: string },
  ): Promise<void>;
  markConsumed(id: string, consumedBy: string): Promise<void>;
}

export type ApprovalRequestPayload = {
  taskId: string;
  canonical: CanonicalAction;
  reason?: string;
  decisionUrl: string;
};

export type ApprovalHandler = {
  id: string;
  request(payload: ApprovalRequestPayload): Promise<void>;
};

export type AuditEvent = {
  ts: string;
  kind: "request" | "decision" | "approval_required" | "approval_decided" | "executed" | "error";
  canonical: CanonicalAction;
  outcome?: {
    status: "allowed" | "denied" | "approval_required" | "executed" | "error";
    reason?: string;
    upstreamStatus?: number;
    latencyMs?: number;
    cost?: ToolAfterRequestMeta["cost"];
    costReason?: string;
    metadata?: ToolAfterRequestMeta["metadata"];
  };
};

export interface AuditSink {
  id: string;
  write(event: AuditEvent): Promise<void>;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

export type ControlPlaneStoreConfig =
  | { type: "memory" }
  | {
      type: "postgres";
      connection: {
        url: string;
      };
    };

export type ACPConfig = {
  routing: RoutingConfig;
  tools?: { dir: string };
  principals?: { dir: string };
  approvals?: { dir: string };
  sinks?: { dir: string };
  gateway: {
    port: number;
    basePath?: string;
  };
  store: ControlPlaneStoreConfig;
  audit?: {
    sinks: string[];
  };
  opa?: {
    enabled: boolean;
    url: string;
  };
  otel?: {
    enabled: boolean;
    otlpEndpoint: string;
    serviceName?: string;
  };
  telemetry?: {
    enabled: boolean;
    endpoint: string;
    intervalHours?: number;
  };
};

export class ACPError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const INTERNAL_HEADERS = {
  APPROVAL_TASK_ID: "x-acp-approval-task-id",
  UPSTREAM_URL: "x-acp-upstream-url",
  TOOL_ID: "x-acp-tool-id",
} as const;

export const REDACTED_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token",
]);

export function toStablePrincipalKey(principal: Principal): string {
  return [principal.tenantId ?? "", principal.env ?? "", principal.agentId ?? "", principal.serviceId ?? ""].join("|");
}

export function testValue(match: string | RegExp | undefined, value: string | undefined): boolean {
  if (match === undefined) {
    return true;
  }
  if (value === undefined) {
    return false;
  }
  if (typeof match === "string") {
    return match === value;
  }
  return match.test(value);
}
