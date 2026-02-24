CREATE TABLE IF NOT EXISTS acp_approval_tasks (
  id varchar(128) PRIMARY KEY,
  status varchar(24) NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz,
  principal_key text NOT NULL,
  method varchar(16) NOT NULL,
  host text NOT NULL,
  path text NOT NULL,
  approval_bind text,
  reason text,
  decided_at timestamptz,
  decided_by text,
  decision_reason text,
  consumed_at timestamptz,
  consumed_by text
);

CREATE TABLE IF NOT EXISTS acp_audit_events (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  payload jsonb NOT NULL
);
