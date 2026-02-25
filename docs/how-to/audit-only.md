# How to run in audit-only mode

Use this mode to observe traffic before enforcing blocks.

## Config

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [],
},
audit: { sinks: ["stdout"] },
```

## Allowed request example

```bash
curl -i -X GET http://localhost:3100/get \
  -H 'x-acp-tool-id: demo-httpbin'
```

Expected: `200`.

## Another request (also allowed)

```bash
curl -i -X DELETE http://localhost:3100/delete \
  -H 'x-acp-tool-id: demo-httpbin'
```

Expected: `200` (because no deny rules exist).

## What to verify

Check sink output for `request` and `executed` events.

## Next steps

- [Block DELETE globally](./block-delete.md)
- [Audit events reference](../reference/audit-events.md)
