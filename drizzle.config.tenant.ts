import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/tenant",
  schema: "./src/infra/db/schemas/schema.tenant.ts",
  dialect: "sqlite",
  driver: "durable-sqlite",
});
