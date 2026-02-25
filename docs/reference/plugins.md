# Plugin Interfaces Reference

## ToolPack

```ts
type ToolPack = {
  id: string;
  match?: (ctx: RequestContext) => boolean;
  resolveUpstream?: (ctx: RequestContext, body?: Buffer) => string | undefined;
  normalize(ctx: RequestContext, body?: Buffer): Partial<{
    tool: string;
    action: string;
    resource: string;
    approvalBind: string;
  }>;
  redact?: {
    headers?: (headers: Record<string, unknown>) => Record<string, unknown>;
    body?: (body: Buffer) => Buffer | null;
  };
  afterRequest?: (input: ToolAfterRequestInput) => Promise<ToolAfterRequestMeta | void> | ToolAfterRequestMeta | void;
};
```

If `match` is omitted, gateway can still select the tool by header:
`x-acp-tool-id: <tool.id>`.

### ToolAfterRequestMeta

```ts
type ToolAfterRequestMeta = {
  cost?: { amount: number; currency?: string };
  reason?: string;
  metadata?: JsonObject;
};
```

## PrincipalResolver

```ts
type PrincipalResolver = {
  id: string;
  resolve(ctx: RequestContext): Promise<Partial<Principal> | null> | Partial<Principal> | null;
};
```

Resolvers merge in load order. Later values overwrite earlier values.

## ApprovalHandler

```ts
type ApprovalHandler = {
  id: string;
  request(payload: ApprovalRequestPayload): Promise<void>;
};
```

Built-ins:
- `noop` from `@acp/approvals`
- webhook handler factory via `createWebhookApprovalHandler(...)`

## AuditSink

```ts
interface AuditSink {
  id: string;
  write(event: AuditEvent): Promise<void>;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}
```

Built-in sink:
- `stdout-json` from `@acp/audit`

## Global plugin helpers

Available via `installGlobals()` before plugin imports:
- `defineTool`
- `definePrincipalResolver`
- `defineApprovalHandler`
- `defineSink`

## Next steps

- [Configuration reference](./configuration.md)
- [How to create a tool](../how-to/tools-create.md)
