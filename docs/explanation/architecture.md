# Architecture

ACP is a request-time control plane. It does not queue jobs or orchestrate workflows.
It evaluates each incoming action, then allows/denies/approves immediately.

## Request path

1. Gateway receives request (`/mcp*` or catch-all HTTP).
2. Build `RequestContext`.
3. Resolve principal by chaining resolvers.
4. Choose tool and normalize action.
5. Resolve upstream URL (tool `resolveUpstream` preferred, header fallback).
6. Evaluate routing action (or OPA if `enforcePolicy`).
7. Execute deny/approval/upstream path.
8. Emit audit and telemetry.
9. Persist control-plane records when store is Postgres.

## Why this order matters

- Principal resolution happens before routing, so policy can use caller identity.
- Tool normalization happens before full rule evaluation, so per-tool controls are possible.
- Approval checks happen before upstream execution, so risky actions are blocked until approved.
- Consume happens after successful upstream execution, enforcing one-time approval usage.

## Upstream target control

Gateway resolves upstream URL in this order:
1. tool-level `resolveUpstream`,
2. request header `x-acp-upstream-url` fallback.

If both are present and mismatch, request is denied (`upstream_not_allowed`).

## Control-plane persistence

When `store.type=postgres`, gateway writes:
- `acp_requests`
- `acp_approval_tasks`
- `acp_audit_events`
- `acp_cost_events`

All are linked via `request_id`.

Practical effect:
- you can join approvals, execution events, and costs back to one request record.

## Docs maintenance

When code changes, update docs here:
- Endpoints/response changes: `docs/reference/endpoints.md`
- Header changes: `docs/reference/headers.md`
- Config/type changes: `docs/reference/configuration.md` and `docs/reference/plugins.md`
- New routing/policy behavior: `docs/how-to/*` and `docs/recipes/cookbook.md`
- Tool selection/upstream behavior: `docs/reference/plugins.md`, `docs/reference/headers.md`, and tutorials that rely on it.

## Versioning and deprecation guidance

- Keep old env aliases documented until removed.
- Mark deprecated fields/functions explicitly with migration path.
- In PRs that change contracts, include docs update in the same PR.
- Keep backward-compatible aliases documented until removal.

## Link hygiene checklist

- Use relative Markdown links.
- Verify links after doc changes.
- Keep anchors stable by avoiding frequent heading renames.

## Operational boundaries

ACP does:
- request governance,
- approval enforcement,
- audit/telemetry emission.

ACP does not do:
- secret management,
- upstream credential lifecycle,
- user-facing approval UI in this repo.

## Next steps

- [Trade-offs](./tradeoffs.md)
- [Reference](../reference/configuration.md)
