# agent-governance-gateway

ACP (Agent Governance Gateway) is an HTTP governance gateway for agent traffic.
It lets you apply routing rules, approvals, policy, audit, and telemetry before requests reach upstream APIs.

Use ACP when you need to answer:
- Who made this agent action?
- Should this action be allowed, denied, or approved first?
- What happened, and how much did it cost?

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Then follow the tutorial:
- [Quickstart Tutorial](./docs/tutorials/quickstart.md)

## Documentation

- [Docs Home](./docs/index.md)
- [Tutorials](./docs/tutorials/quickstart.md)
- [How-to Guides](./docs/how-to/audit-only.md)
- [Reference](./docs/reference/configuration.md)
- [Explanations](./docs/explanation/why.md)
- [Cookbook](./docs/recipes/cookbook.md)
- [Troubleshooting](./docs/troubleshooting.md)
- [FAQ](./docs/faq.md)

## Docs website (GitHub Pages)

This repo includes GitHub Pages CI/CD for docs:
- Workflow: [`.github/workflows/docs.yml`](./.github/workflows/docs.yml)
- Static site config: [`mkdocs.yml`](./mkdocs.yml)

How it works:
- Pull requests: build docs in CI (`mkdocs build --strict`)
- `main` branch: build + deploy to GitHub Pages

To enable:
1. In GitHub repo settings, open `Pages`.
2. Set source to `GitHub Actions`.
3. Push to `main` or run the `Docs` workflow manually.
