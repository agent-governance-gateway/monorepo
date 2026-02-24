import Fastify from "fastify";

export async function startUpstreamServer(port = 3200): Promise<{ close: () => Promise<void> }> {
  const app = Fastify({ logger: false });

  app.all("/*", async (req) => {
    return {
      ok: true,
      method: req.method,
      path: req.url,
      echo: req.body ?? null,
      from: "upstream",
    };
  });

  await app.listen({ port, host: "0.0.0.0" });
  return {
    close: async () => app.close(),
  };
}
