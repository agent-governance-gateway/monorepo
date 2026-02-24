# Why ACP Exists

ACP exists because most teams ship agent features faster than they can govern them.

## The Core Pain

You launch an agent that calls APIs directly. It works in staging. Then production reality hits:
- A prompt variation triggers an unintended destructive call.
- You need human approval for high-risk actions, but there's no robust workflow.
- Security asks for evidence of decisions and controls.
- Logs contain too little context or too much sensitive data.

## Before / After

### Before ACP
- Every app implements custom checks differently.
- No uniform model of action/principal/risk.
- Approvals are manual and not tied to exact retry execution.

### After ACP
- All requests pass through one Gateway decision point.
- Requests are normalized to canonical actions.
- Approvals are first-class (`Approval Task`) and one-time consumable.
- Audit events are structured and redact sensitive headers by default.

## Real-World Narrative

You run a support agent that can read/write ticket systems.
- Read requests can pass through.
- Write requests in `prod` should require approval.
- Deletion operations should be denied.

With ACP, this becomes simple rules, not ad-hoc checks in multiple apps.

## When Not To Use ACP

ACP is likely overkill if:
- You only have low-risk, internal, read-only automation.
- You do not need approvals, policy, or audit traceability.
- You can tolerate direct calls without a governance layer.

## Decision Checklist

Use ACP when at least one is true:
- You need enforceable approval for risky actions.
- You need an audit trail for governance/compliance.
- You want centralized policy/routing logic.
- You run agents across multiple teams/services and need consistency.
