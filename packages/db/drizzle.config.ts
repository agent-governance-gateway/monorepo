import { defineConfig } from "drizzle-kit";
import { getDbUrl } from "../env/src/index.ts";

export default defineConfig({
  schema: ["./src/schema/approvals.ts", "./src/schema/audit.ts", "./src/schema/costs.ts", "./src/schema/requests.ts"],
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: getDbUrl(),
  },
});
