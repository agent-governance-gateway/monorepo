# How to block DELETE globally

## Config

```ts
routing: {
  defaultAction: { type: "passThrough" },
  rules: [
    { match: { method: "DELETE" }, action: { type: "deny", reason: "delete_is_forbidden" } },
  ],
},
```

## Allowed request

```bash
curl -i -X GET http://localhost:3100/get \
  -H 'x-acp-tool-id: demo-httpbin'
```

Expected: `200`.

## Blocked request

```bash
curl -i -X DELETE http://localhost:3100/delete \
  -H 'x-acp-tool-id: demo-httpbin'
```

Expected: `403`

```json
{ "error": "denied", "reason": "delete_is_forbidden" }
```

## Next steps

- [Allow all except selected patterns](./allow-except.md)
- [Routing reference](../reference/configuration.md#routing)
