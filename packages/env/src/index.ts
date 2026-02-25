export const ENV_DEFAULTS = {
  DB_URL: "postgres://postgres:postgres@localhost:5432/postgres",
  STORE_TYPE: "memory",
  APPROVER_WEBHOOK_URL: "",
  GATEWAY_PORT: "3100",
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

export function getStoreUrl(): string | undefined {
  return envString("STORE_URL")
    ?? envString("DATABASE_URL")
    ?? envString("DB_URL")
    ?? envString("APPROVALS_DB_URL");
}

export function getStoreType(): "memory" | "postgres" {
  const raw = envString("STORE_TYPE") ?? envString("APPROVALS_STORE") ?? ENV_DEFAULTS.STORE_TYPE;
  return raw === "postgres" ? "postgres" : "memory";
}

/**
 * @deprecated use getStoreUrl()
 */
export function getApprovalsDbUrl(): string | undefined {
  return getStoreUrl();
}

/**
 * @deprecated use getStoreType()
 */
export function getApprovalsStoreType(): "memory" | "postgres" {
  return getStoreType();
}

export function getApproverWebhookUrl(): string {
  return envString("APPROVER_WEBHOOK_URL", ENV_DEFAULTS.APPROVER_WEBHOOK_URL)!;
}

export function getGatewayPort(): number {
  const raw = envString("GATEWAY_PORT", ENV_DEFAULTS.GATEWAY_PORT);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3100;
}

export function getTestAuditFile(): string | undefined {
  return envString("ACP_TEST_AUDIT_FILE");
}
