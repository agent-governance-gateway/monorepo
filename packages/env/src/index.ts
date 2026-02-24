export const ENV_DEFAULTS = {
  DB_URL: "postgres://postgres:postgres@localhost:5432/postgres",
  APPROVER_WEBHOOK_URL: "http://localhost:3300/approval-request",
} as const;

export function envString(name: string, defaultValue?: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value;
}

export function getDbUrl(): string {
  return envString("DB_URL", ENV_DEFAULTS.DB_URL)!;
}

export function getApprovalsDbUrl(): string | undefined {
  return envString("APPROVALS_DB_URL");
}

export function getApproverWebhookUrl(): string {
  return envString("APPROVER_WEBHOOK_URL", ENV_DEFAULTS.APPROVER_WEBHOOK_URL)!;
}

export function getTestAuditFile(): string | undefined {
  return envString("ACP_TEST_AUDIT_FILE");
}
