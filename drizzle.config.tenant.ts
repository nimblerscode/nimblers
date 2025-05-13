import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/tenant",
  schema: "./src/infrastructure/persistence/tenant/sqlite/schema.ts",
  dialect: "sqlite",
  driver: "durable-sqlite",
});
