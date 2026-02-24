# Helm Charts

## ACP Gateway Chart

Path: `helm/acp-gateway`

Install:

```bash
helm upgrade --install acp-gateway ./helm/acp-gateway \
  --namespace acp --create-namespace \
  --set image.repository=ghcr.io/your-org/acp-gateway \
  --set image.tag=latest
```

Optional config map mount:

```bash
helm upgrade --install acp-gateway ./helm/acp-gateway \
  --set config.enabled=true \
  --set config.data.acp\.config\.ts='export default defineConfig(() => ({ gateway: { port: 3100 }, routing: { defaultAction: { type: "passThrough" }, rules: [] } }))'
```

Values are in `helm/acp-gateway/values.yaml`.
