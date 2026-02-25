# How to resolve principals from domain or subdomain

Use this when tenant/agent identity is encoded in hostnames.

## Resolver

```ts
/// <reference types="@acp/config/globals" />

export default definePrincipalResolver({
  id: "domain-agent",
  resolve: (ctx) => {
    if (!ctx.host.endsWith(".agents.local")) return null;
    return { agentId: ctx.host.replace(".agents.local", "") };
  },
});
```

## Request example

```bash
curl -i -X POST http://localhost:3100/invoke \
  -H 'host: bot-7.agents.local' \
  -H 'x-acp-tool-id: demo-httpbin' \
  -H 'content-type: application/json' \
  -d '{}'
```

Expected: principal includes `agentId: "bot-7"`.

## Combined resolver behavior

Resolvers are loaded in filename order. Later resolver values overwrite earlier ones.

Example order:
- `01-headers.ts`
- `20-domain.ts`
- `99-fallback.ts`

## Next steps

- [Header principals](./principals-headers.md)
- [Principal merge explanation](../explanation/concepts.md)
