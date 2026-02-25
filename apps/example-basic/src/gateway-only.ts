import configFactory from "../acp.config.js";
import { createGateway } from "@acp/gateway";

async function main(): Promise<void> {
  const gateway = await createGateway(configFactory, { cwd: new URL("..", import.meta.url).pathname });
  await gateway.start();

  const shutdown = async () => {
    await gateway.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
