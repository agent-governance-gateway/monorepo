import configFactory from "./acp.config.js";
import { runGateway } from "@acp/gateway";

runGateway(configFactory, { exitOnError: true });
