import Fastify from "fastify";

export async function startApproverServer(port = 3300): Promise<{ close: () => Promise<void> }> {
  const app = Fastify({ logger: false });

  app.post("/approval-request", async (req) => {
    const payload = req.body as { taskId: string; decisionUrl: string };
    setTimeout(async () => {
      await fetch(payload.decisionUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          decidedBy: "example-approver",
          reason: "auto-approved by mock",
        }),
      });
    }, 200);

    return { accepted: true, taskId: payload.taskId };
  });

  await app.listen({ port, host: "0.0.0.0" });
  return {
    close: async () => app.close(),
  };
}
