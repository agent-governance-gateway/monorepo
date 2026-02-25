# Deployment

## Local dev (recommended first)

```bash
pnpm install
cp .env.example .env
pnpm dev
```

This runs a single Gateway process (`apps/example-basic/index.ts`).

## Store modes

Memory (default):

```bash
export STORE_TYPE=memory
pnpm dev
```

Postgres:

```bash
export STORE_TYPE=postgres
export STORE_URL=postgres://postgres:postgres@localhost:5432/postgres
pnpm dev
```

## Docker

Build image:

```bash
docker build -t acp-gateway:local .
```

Run gateway + postgres:

```bash
docker compose up --build
```

No mock upstream/approver services are required.

## Helm / Kubernetes

Chart path: `helm/acp-gateway`

Minimal install:

```bash
helm upgrade --install acp-gateway ./helm/acp-gateway \
  --namespace acp --create-namespace \
  --set image.repository=ghcr.io/your-org/acp-gateway \
  --set image.tag=latest
```

Postgres-backed store example:

```bash
helm upgrade --install acp-gateway ./helm/acp-gateway \
  --namespace acp --create-namespace \
  --set env.STORE_TYPE=postgres \
  --set secretEnv.STORE_URL.name=acp-secrets \
  --set secretEnv.STORE_URL.key=store_url \
  --set config.enabled=true
```

Use request header `x-acp-upstream-url` to target real upstream services.
