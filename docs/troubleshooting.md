# Troubleshooting

## `missing_upstream`

Cause: matched tool has no `resolveUpstream` and request omitted `x-acp-upstream-url`.

Fix: either send `x-acp-upstream-url` or add `resolveUpstream` to the tool.

## `upstream_not_allowed`

Cause: request sent `x-acp-upstream-url` that does not match tool pinned upstream.

Fix: remove header or make it exactly match the tool upstream.

## `approval_not_found`

Cause: wrong or expired task id.

Fix: use `approval_task_id` returned by `approval_required` response.

## `not_approved`

Cause: task is still pending or denied.

Fix: submit approval decision and retry.

## `already_consumed`

Cause: approval task already used successfully once.

Fix: create a new request and approval task.

## `binding_mismatch`

Cause: retry request differs in principal/method/host/path/approvalBind.

Fix: retry the exact same action context.

## `403 forbidden` on approval endpoints

Cause: principal does not own the task.

Fix: call with same principal identity used to create the task.

## `config_error` with postgres store

Cause: `STORE_TYPE=postgres` but no `STORE_URL`.

Fix: set `STORE_URL` or alias (`DATABASE_URL`, `DB_URL`).

## Next steps

- [FAQ](./faq.md)
- [Endpoints reference](./reference/endpoints.md)
