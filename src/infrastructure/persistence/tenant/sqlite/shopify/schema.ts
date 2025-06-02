import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Nonces table for CSRF protection in OAuth flow
export const nonces = sqliteTable("nonces", {
  nonce: text("nonce").primaryKey().notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  consumed: integer("consumed", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

// Access tokens table for storing Shopify app access tokens
export const accessTokens = sqliteTable("access_tokens", {
  shop: text("shop").primaryKey().notNull(), // shop.myshopify.com
  accessToken: text("access_token").notNull(),
  scope: text("scope").notNull(),
  organizationSlug: text("organization_slug"), // Make nullable for migration
  tokenType: text("token_type").default("bearer"), // Usually 'bearer'
  expiresIn: integer("expires_in"), // Token expiration in seconds (if applicable)
  associatedUserScope: text("associated_user_scope"), // For online tokens
  associatedUserId: text("associated_user_id"), // For online tokens
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).default(
    sql`(unixepoch() * 1000)`,
  ),
});

export type Nonce = typeof nonces.$inferSelect;
export type NewNonce = typeof nonces.$inferInsert;

export type AccessToken = typeof accessTokens.$inferSelect;
export type NewAccessToken = typeof accessTokens.$inferInsert;
