# Architecture

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

## Control-plane persistence

When `store.type=postgres`, gateway writes:
- `acp_requests`
- `acp_approval_tasks`
- `acp_audit_events`
- `acp_cost_events`

All are linked via `request_id`.

## Docs maintenance

When code changes, update docs here:
- Endpoints/response changes: `docs/reference/endpoints.md`
- Header changes: `docs/reference/headers.md`
- Config/type changes: `docs/reference/configuration.md` and `docs/reference/plugins.md`
- New routing/policy behavior: `docs/how-to/*` and `docs/recipes/cookbook.md`

## Versioning and deprecation guidance

- Keep old env aliases documented until removed.
- Mark deprecated fields/functions explicitly with migration path.
- In PRs that change contracts, include docs update in the same PR.

## Link hygiene checklist

- Use relative Markdown links.
- Verify links after doc changes.
- Keep anchors stable by avoiding frequent heading renames.

## Next steps

- [Trade-offs](./tradeoffs.md)
- [Reference](../reference/configuration.md)
