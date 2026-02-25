CREATE TABLE IF NOT EXISTS acp_cost_events (
  id bigserial PRIMARY KEY,
  request_id uuid,
  ts timestamptz NOT NULL DEFAULT now(),
  cost_amount double precision,
  cost_currency text,
  reason text,
  upstream_status double precision,
  latency_ms double precision,
  metadata jsonb
);
