import { startApproverServer } from "./approver.js";

async function main(): Promise<void> {
  const server = await startApproverServer();
  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
