# Deployment

This page covers local, Docker, and Kubernetes (Helm).

## Local development

```bash
pnpm install
cp .env.example .env
pnpm dev:example
```

For gateway-only process:

```bash
pnpm --filter @acp/example-basic dev:gateway
```

## Production build (workspace)

```bash
pnpm install
pnpm build
```

Packages are built with `tsup` into each package `dist/`.

## Docker

Repository now includes:
- `Dockerfile`
- `docker-compose.yml`

### Build image

```bash
docker build -t acp-gateway:local .
```

### Run compose (gateway + upstream + approver + postgres)

```bash
docker compose up --build
```

Optional OPA service:

```bash
docker compose --profile opa up --build
```

### Compose envs used

- `APPROVALS_DB_URL`
- `APPROVER_WEBHOOK_URL`

## Kubernetes with Helm

Chart path: `helm/acp-gateway`

### Minimal install

```bash
helm upgrade --install acp-gateway ./helm/acp-gateway \
  --namespace acp --create-namespace \
  --set image.repository=ghcr.io/your-org/acp-gateway \
  --set image.tag=latest
```

### Important chart values

From `helm/acp-gateway/values.yaml`:
- `image.repository`, `image.tag`
- `service.port`, `service.targetPort`
- `env` (plain env vars)
- `secretEnv` (secret refs)
- `config.enabled`, `config.mountPath`, `config.data`
- probes: `livenessProbe`, `readinessProbe`

### Config map mount example

```bash
helm upgrade --install acp-gateway ./helm/acp-gateway \
  --set config.enabled=true \
  --set config.mountPath=/app/config \
  --set config.data.acp\.config\.ts='export default defineConfig(() => ({ gateway: { port: 3100 }, routing: { defaultAction: { type: "passThrough" }, rules: [] } }))'
```

### Prod-ish install example

```bash
helm upgrade --install acp-gateway ./helm/acp-gateway \
  --namespace acp --create-namespace \
  --set image.repository=ghcr.io/your-org/acp-gateway \
  --set image.tag=v0.1.0 \
  --set env.NODE_ENV=production \
  --set secretEnv.APPROVALS_DB_URL.name=acp-secrets \
  --set secretEnv.APPROVALS_DB_URL.key=approvals_db_url \
  --set config.enabled=true
```

> NOTE
> The chart is generic. You still need to provide your gateway runtime command/config inside your container image strategy.
