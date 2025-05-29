import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { normalizeDate } from "@/infrastructure/persistence/common/utils"; // Import the helper

// --- Better Auth Organization Plugin Tables ---

// IMPORTANT: Export order matters for migration generation
// Organization table MUST come first because other tables reference it

// Organization table (aligned with better-auth)
export const organization = sqliteTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"), // For custom JSON data
  createdAt: normalizeDate("createdAt").notNull(), // Now stores ISO string
  // Removed updatedAt to match better-auth schema
});

// Connected stores table - for Shopify, WooCommerce, etc.
export const connectedStore = sqliteTable("connected_store", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'shopify', 'woocommerce', etc.
  shopDomain: text("shopDomain").notNull(), // e.g., 'my-shop.myshopify.com'
  scope: text("scope"), // OAuth scopes granted
  status: text("status").notNull().default("active"), // 'active', 'disconnected', 'error'
  connectedAt: normalizeDate("connectedAt").notNull(),
  lastSyncAt: normalizeDate("lastSyncAt"), // Track when we last synced data
  metadata: text("metadata"), // JSON for store-specific data
  createdAt: normalizeDate("createdAt").notNull(),
});

// Member table (aligned with better-auth)
export const member = sqliteTable("member", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(), // ID from the gateway's user table
  // organizationId: text("organizationId")
  //   .notNull()
  //   .references(() => organization.id),
  role: text("role").notNull(), // e.g., 'owner', 'admin', 'member'
  createdAt: normalizeDate("createdAt").notNull(), // Now stores ISO string
  // Removed updatedAt to match better-auth schema
});

export const invitationStatusEnum = [
  "pending",
  "accepted",
  "expired",
  "revoked",
] as const;

// Invitation table (aligned with better-auth)
export const invitation = sqliteTable("invitation", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  // organizationId: text("organizationId").notNull(),
  inviterId: text("inviterId").notNull(), // ID from the gateway's user table
  role: text("role").notNull(),
  status: text("status", { enum: invitationStatusEnum })
    .notNull()
    .default("pending"),
  expiresAt: normalizeDate("expiresAt").notNull(), // Now stores ISO string
  createdAt: normalizeDate("createdAt").notNull(), // Now stores ISO string
  // Removed updatedAt to match better-auth schema
});
