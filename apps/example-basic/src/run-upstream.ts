import { startUpstreamServer } from "./upstream.js";

async function main(): Promise<void> {
  const server = await startUpstreamServer();
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
