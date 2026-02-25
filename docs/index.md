# ACP Documentation

ACP docs follow Diátaxis:
- Tutorials: learn by doing.
- How-to guides: solve specific tasks.
- Reference: complete specs.
- Explanation: architecture and trade-offs.

## View docs as a website

Local preview:

```bash
python -m pip install mkdocs mkdocs-material pymdown-extensions
mkdocs serve
```

Open `http://127.0.0.1:8000`.

## Start here

1. [Quickstart Tutorial](./tutorials/quickstart.md)
2. [Approvals End-to-End Tutorial](./tutorials/approvals-end-to-end.md)

## Tutorials

- [Quickstart](./tutorials/quickstart.md)
- [Approvals End-to-End](./tutorials/approvals-end-to-end.md)

## How-to guides

- [Audit-only mode](./how-to/audit-only.md)
- [Block DELETE globally](./how-to/block-delete.md)
- [Allow all except specific patterns](./how-to/allow-except.md)
- [Require approvals for prod writes](./how-to/prod-approvals.md)
- [Principals from headers](./how-to/principals-headers.md)
- [Principals from domain/subdomain](./how-to/principals-domain.md)
- [Create a tool pack](./how-to/tools-create.md)
- [Enable OPA policy checks](./how-to/opa-enable.md)
- [Enable OpenTelemetry](./how-to/otel-enable.md)
- [Run with Docker](./how-to/docker-run.md)
- [Deploy with Helm](./how-to/helm-deploy.md)

## Reference

- [Configuration reference](./reference/configuration.md)
- [Headers reference](./reference/headers.md)
- [Endpoints reference](./reference/endpoints.md)
- [Plugin interfaces](./reference/plugins.md)
- [Audit events reference](./reference/audit-events.md)
- [OpenTelemetry spans/metrics](./reference/otel-spans-metrics.md)
- [OPA contract](./reference/opa-contract.md)

## Explanation

- [Why ACP](./explanation/why.md)
- [Core concepts](./explanation/concepts.md)
- [Architecture](./explanation/architecture.md)
- [Security model](./explanation/security-model.md)
- [Trade-offs](./explanation/tradeoffs.md)

## Recipes

- [Cookbook](./recipes/cookbook.md)

## Operations

- [Troubleshooting](./troubleshooting.md)
- [FAQ](./faq.md)
