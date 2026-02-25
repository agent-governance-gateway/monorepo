CREATE TABLE IF NOT EXISTS acp_requests (
  id uuid PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  principal_key text NOT NULL,
  tenant_id text,
  env text,
  agent_id text,
  service_id text,
  user_id text,
  workflow_id text,
  execution_id text,
  run_id text,
  channel text NOT NULL,
  method text NOT NULL,
  host text NOT NULL,
  path text NOT NULL,
  approval_bind text,
  tool text,
  action text,
  resource text,
  metadata jsonb
);

ALTER TABLE acp_approval_tasks ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE acp_audit_events ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE acp_cost_events ADD COLUMN IF NOT EXISTS request_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acp_approval_tasks_request_id_fkey'
  ) THEN
    ALTER TABLE acp_approval_tasks
      ADD CONSTRAINT acp_approval_tasks_request_id_fkey
      FOREIGN KEY (request_id) REFERENCES acp_requests(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acp_audit_events_request_id_fkey'
  ) THEN
    ALTER TABLE acp_audit_events
      ADD CONSTRAINT acp_audit_events_request_id_fkey
      FOREIGN KEY (request_id) REFERENCES acp_requests(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acp_cost_events_request_id_fkey'
  ) THEN
    ALTER TABLE acp_cost_events
      ADD CONSTRAINT acp_cost_events_request_id_fkey
      FOREIGN KEY (request_id) REFERENCES acp_requests(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS principal_key;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS env;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS agent_id;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS service_id;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS user_id;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS workflow_id;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS execution_id;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS run_id;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS method;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS host;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS path;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS approval_bind;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS tool;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS action;
ALTER TABLE acp_audit_events DROP COLUMN IF EXISTS resource;

ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS principal_key;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS env;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS agent_id;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS user_id;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS workflow_id;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS execution_id;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS run_id;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS method;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS host;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS path;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS approval_bind;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS tool;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS action;
ALTER TABLE acp_cost_events DROP COLUMN IF EXISTS resource;
