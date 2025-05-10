import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { normalizeDate } from "./utils"; // Import the helper

// === Better Auth Aligned Schema ===

const timestamp = {
  createdAt: normalizeDate("createdAt").notNull(), // Now stores ISO string
  updatedAt: normalizeDate("updatedAt").notNull(), // Now stores ISO string
};

// Users Table
export const user = sqliteTable("user", {
  id: text("id").primaryKey().notNull(), // UUID stored as text
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"), // URL to profile image
  role: text("role").default("admin"), // Example: 'user', 'admin'
  ...timestamp,
});

// Sessions Table
export const session = sqliteTable("session", {
  id: text("id").primaryKey(), // Session ID
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(), // The actual session token value
  expiresAt: normalizeDate("expiresAt").notNull(), // Now stores ISO string
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  activeOrganizationId: text("activeOrganizationId"), // Added field for active org
  ...timestamp,
});

// Accounts Table (for credentials, OAuth, etc.)
export const account = sqliteTable("account", {
  id: text("id").primaryKey(), // Optional: Use a separate UUID for account records
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(), // The user's unique ID on the provider's system
  providerId: text("providerId").notNull(), // e.g., 'credential', 'google', 'github'
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  accessTokenExpiresAt: normalizeDate("accessTokenExpiresAt"), // Now stores ISO string
  refreshTokenExpiresAt: normalizeDate("refreshTokenExpiresAt"), // Now stores ISO string
  scope: text("scope"),
  idToken: text("idToken"),
  password: text("password"), // Hashed password (only for 'credential' provider)
  // Add other provider-specific fields if needed
  ...timestamp,
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: normalizeDate("expiresAt").notNull(), // Now stores ISO string
  ...timestamp,
});

// === Organizations Table ===
export const organization = sqliteTable("organization", {
  id: text("orgId").primaryKey().notNull(), // Matches DO name/ID
  name: text("name").notNull().unique(),
  status: text("status").default("active").notNull(), // 'active', 'archived', etc.
  creatorId: text("creatorId")
    .notNull()
    .references(() => user.id, { onDelete: "no action" }),
  ...timestamp,
});
