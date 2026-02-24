import crypto from "node:crypto";
import { toStablePrincipalKey, type ApprovalTask, type CanonicalAction } from "@acp/core";
import { safeTimingEqualHex } from "@acp/utils";

export function generateTaskId(): string {
  return crypto.randomUUID();
}

export function getApprovalBinding(canonical: CanonicalAction): {
  principalKey: string;
  method: string;
  host: string;
  path: string;
  approvalBind?: string;
} {
  return {
    principalKey: toStablePrincipalKey(canonical.principal),
    method: canonical.request.method,
    host: canonical.request.host,
    path: canonical.request.path,
    approvalBind: canonical.target.approvalBind,
  };
}

export function sameBinding(task: ApprovalTask, canonical: CanonicalAction): boolean {
  const bind = getApprovalBinding(canonical);
  return (
    task.principalKey === bind.principalKey &&
    task.method === bind.method &&
    task.host === bind.host &&
    task.path === bind.path &&
    (task.approvalBind ?? "") === (bind.approvalBind ?? "")
  );
}

export function verifyDecisionSignature(secret: string, payload: unknown, provided: string | undefined): boolean {
  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  return safeTimingEqualHex(expected, provided);
}
