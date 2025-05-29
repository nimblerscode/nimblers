import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/shopify",
  schema: "./src/infrastructure/persistence/tenant/sqlite/shopify/schema.ts",
  dialect: "sqlite",
  driver: "durable-sqlite",
});
