# How to run with Docker

## Prerequisites

- Docker
- Docker Compose

## Option A: run gateway only (memory store)

```bash
docker build -t acp-gateway:local .
docker run --rm -p 3100:3100 -e STORE_TYPE=memory acp-gateway:local
```

Success looks like:
- container is up
- `GET http://localhost:3100/healthz` returns `{ "ok": true }`

## Option B: run gateway + postgres

```bash
docker compose up --build
```

This starts:
- `gateway`
- `postgres`

Gateway env in compose:
- `STORE_TYPE=postgres`
- `STORE_URL=postgres://postgres:postgres@postgres:5432/postgres`

## Common failure modes

- `config_error`: missing `STORE_URL` when `STORE_TYPE=postgres`.
- connection refused to Postgres: check compose service health/network.

## Next steps

- [Deployment with Helm](./helm-deploy.md)
- [Environment variables reference](../reference/configuration.md#environment-variables)
