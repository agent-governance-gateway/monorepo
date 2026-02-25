# Audit Events Reference

`AuditEvent.kind` type includes:
- `request`
- `decision`
- `approval_required`
- `approval_decided`
- `executed`
- `error`

Gateway currently emits:
- `request`
- `approval_required`
- `approval_decided`
- `executed`
- `error`

## Event shape

```ts
type AuditEvent = {
  ts: string;
  kind: "request" | "decision" | "approval_required" | "approval_decided" | "executed" | "error";
  canonical: CanonicalAction;
  outcome?: {
    status: "allowed" | "denied" | "approval_required" | "executed" | "error";
    reason?: string;
    upstreamStatus?: number;
    latencyMs?: number;
    cost?: { amount: number; currency?: string };
    costReason?: string;
    metadata?: JsonObject;
  };
};
```

## Where events are written

- configured sinks (`audit.sinks`) or defaults (`stdout`, `stdout-json`)
- postgres table `acp_audit_events` when `store.type=postgres`

## Example executed event

```json
{
  "kind": "executed",
  "outcome": {
    "status": "executed",
    "upstreamStatus": 200,
    "latencyMs": 123,
    "cost": { "amount": 0.0021, "currency": "USD" },
    "costReason": "token_pricing",
    "metadata": { "provider": "openai", "totalTokens": 320 }
  }
}
```

## Next steps

- [Audit-only how-to](../how-to/audit-only.md)
- [Security model](../explanation/security-model.md)
