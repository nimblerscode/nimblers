import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/conversation",
  schema: "./src/infrastructure/persistence/conversation/sqlite/schema.ts",
  dialect: "sqlite",
  driver: "durable-sqlite",
});
