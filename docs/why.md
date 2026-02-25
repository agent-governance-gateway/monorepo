# Why ACP

## Problem

Agent systems make many outbound calls quickly. Without a governance layer:
- destructive calls can slip through,
- approvals are manual and inconsistent,
- logs are not enough for accountability,
- security controls become app-by-app custom code.

## Outcome

ACP centralizes control with simple rules and plugins:
- deny risky actions,
- require approval for sensitive writes,
- keep one-time approval execution,
- emit structured audit events.

## Before / after

### Before
- every app/team has different checks,
- no stable principal/action model,
- no reusable approval lifecycle.

### After
- one Gateway path for decisions,
- canonical action for routing/policy,
- traceable approval and execution flow.

## Who benefits

- CTO/CISO: fast risk visibility and enforceable controls.
- Platform teams: one governance layer for many agent apps.
- Product teams: less security logic in business code.

## When not to use

ACP may be unnecessary if:
- traffic is low-risk read-only,
- no approval or audit requirements,
- a direct integration is enough.
