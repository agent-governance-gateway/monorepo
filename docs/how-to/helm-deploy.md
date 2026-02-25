# How to deploy with Helm

Chart path: `helm/acp-gateway`.

## Prerequisites

- Kubernetes cluster
- Helm 3+

## Minimal install

```bash
helm upgrade --install acp-gateway ./helm/acp-gateway \
  --namespace acp --create-namespace \
  --set image.repository=ghcr.io/your-org/acp-gateway \
  --set image.tag=latest
```

Success looks like:
- Deployment pods are Running
- `GET /healthz` returns `{ "ok": true }`

## Postgres-backed store install

```bash
helm upgrade --install acp-gateway ./helm/acp-gateway \
  --namespace acp --create-namespace \
  --set env.STORE_TYPE=postgres \
  --set secretEnv.STORE_URL.name=acp-secrets \
  --set secretEnv.STORE_URL.key=store_url
```

## Config map mount

```bash
helm upgrade --install acp-gateway ./helm/acp-gateway \
  --set config.enabled=true \
  --set config.mountPath=/app/config \
  --set config.data.acp\.config\.ts='export default defineConfig(() => ({ gateway: { port: 3100 }, store: { type: "memory" }, routing: { defaultAction: { type: "passThrough" }, rules: [] } }))'
```

## Common failure modes

- `values.yaml` uses `ACP_PORT`, but example app reads `GATEWAY_PORT`. Set `env.GATEWAY_PORT` for this repo image.
- Wrong image command/args: keep container entrypoint compatible with image defaults.

## Next steps

- [Deployment architecture](../explanation/architecture.md)
- [Configuration reference](../reference/configuration.md)
