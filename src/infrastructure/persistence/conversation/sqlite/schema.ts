import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { normalizeDate } from "@/infrastructure/persistence/common/utils";

// --- Conversation Durable Object Schema ---
// Note: This schema is scoped to a single conversation between a customer and the store
// Each conversation gets its own DO and SQLite database
//
// Architecture:
// - Triggered when a customer replies to a campaign message
// - Handles ongoing messaging thread
// - Stores message history, context, and conversation state
// - Independent from campaign orchestration
// - SINGLE SOURCE OF TRUTH for conversation status, activity, and message data
// - Tenant DO only maintains lightweight registry of campaign-conversation relationships

export const conversationStatusEnum = [
  "active",
  "paused",
  "resolved",
  "archived",
] as const;

export const messageStatusEnum = [
  "pending",
  "sent",
  "delivered",
  "failed",
  "read",
] as const;

export const messageDirectionEnum = [
  "inbound", // From customer to store
  "outbound", // From store to customer
] as const;

// Conversation metadata (single record per conversation DO)
export const conversation = sqliteTable("conversation", {
  id: text("id").primaryKey(),
  organizationSlug: text("organizationSlug").notNull(), // Which org this belongs to
  campaignId: text("campaignId"), // Original campaign that started this (optional)
  customerPhone: text("customerPhone").notNull(), // Customer's phone number
  storePhone: text("storePhone").notNull(), // Store's phone number used
  status: text("status", { enum: conversationStatusEnum })
    .notNull()
    .default("active"),
  lastMessageAt: normalizeDate("lastMessageAt"), // Timestamp of last message
  createdAt: normalizeDate("createdAt").notNull(),
  metadata: text("metadata"), // JSON for conversation context (customer data, etc.)
});

// Individual messages within the conversation
export const message = sqliteTable("message", {
  id: text("id").primaryKey(),
  direction: text("direction", { enum: messageDirectionEnum }).notNull(),
  content: text("content").notNull(), // Message text content
  status: text("status", { enum: messageStatusEnum })
    .notNull()
    .default("pending"),

  // Message metadata
  messageType: text("messageType"), // 'text', 'image', 'template', etc.
  externalMessageId: text("externalMessageId"), // Twilio/provider message ID

  // Delivery tracking
  sentAt: normalizeDate("sentAt"),
  deliveredAt: normalizeDate("deliveredAt"),
  readAt: normalizeDate("readAt"),
  failedAt: normalizeDate("failedAt"),
  failureReason: text("failureReason"),

  createdAt: normalizeDate("createdAt").notNull(),
  metadata: text("metadata"), // JSON for message-specific data
});
