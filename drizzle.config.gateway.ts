import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle/gateway", // Separate output directory for gateway migrations
  schema: "./src/infra/db/schemas/schema.ts", // Point to the unified schema file in the infra directory
  dialect: "sqlite", // D1 uses SQLite dialect
  driver: "d1-http", // Specify the D1 driver
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID as string,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID as string,
    token: process.env.CLOUDFLARE_D1_TOKEN as string,
  },
});
