// import { defineScript } from "@redwoodjs/sdk/worker";
// import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
// import * as tenants from "./schemas/schema.tenant";

// let db: DrizzleD1Database<Record<string, never>>;

// export default defineScript(async ({ env }) => {
//   db = drizzle(env.DB);

//   await db.insert(tenants.member).values({
//     id: "localhost",
//     subdomain: "localhost",
//   });

//   console.log("🌱 Finished seeding");
// });
