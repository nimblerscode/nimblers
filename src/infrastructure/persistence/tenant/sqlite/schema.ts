import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  normalizeDate,
  normalizeDateNullable,
} from "@/infrastructure/persistence/common/utils"; // Import the helper

// --- Organization Durable Object Schema ---
// Note: This schema is scoped to a single organization
// No organizationId foreign keys needed since each org has its own DO database
//
// Architecture:
// - Organization DO: Campaign orchestration, segment management, member management
// - Conversation DO: Message delivery, customer replies, conversation threads
// - Campaign DO focuses on: scheduling, targeting, execution tracking
// - Conversation DO focuses on: individual messages, delivery status, customer interactions
// - Cross-DO tracking: campaignConversation table maintains campaign-conversation relationships

// Enums for better type safety
export const campaignStatusEnum = [
  "draft",
  "scheduled",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;

export const campaignTypeEnum = [
  "sms",
  "email",
  "whatsapp",
  "push_notification",
] as const;

export const segmentStatusEnum = ["active", "paused", "archived"] as const;

export const segmentTypeEnum = ["manual", "automatic", "shopify_sync"] as const;

// Organization metadata table (single record per organization DO)
export const organization = sqliteTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"), // For custom JSON data
  createdAt: normalizeDate("createdAt").notNull(),
  phoneNumber: text("phoneNumber"), // Primary organization phone number
  // Additional phone number fields for messaging
  smsFromNumber: text("smsFromNumber"), // Dedicated SMS sending number
  whatsappFromNumber: text("whatsappFromNumber"), // Dedicated WhatsApp Business number
});

// Enhanced campaign table for messaging campaigns
export const campaign = sqliteTable("campaign", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  campaignType: text("campaignType", { enum: campaignTypeEnum }).notNull(),
  status: text("status", { enum: campaignStatusEnum })
    .notNull()
    .default("draft"),

  // Scheduling
  scheduledAt: normalizeDateNullable("scheduledAt"), // When to send (null = send immediately)
  timezone: text("timezone").default("UTC"), // Timezone for scheduling

  // Targeting
  segmentIds: text("segmentIds"), // JSON array of segment IDs

  // Campaign-level execution timestamps
  campaignSentAt: normalizeDateNullable("campaignSentAt"), // When the campaign was executed
  estimatedDeliveryTime: normalizeDateNullable("estimatedDeliveryTime"), // Expected completion time

  // Timestamps
  createdAt: normalizeDate("createdAt").notNull(),
  updatedAt: normalizeDate("updatedAt").notNull(),
  startedAt: normalizeDateNullable("startedAt"), // When campaign execution started
  completedAt: normalizeDateNullable("completedAt"), // When campaign execution finished

  // Campaign settings
  metadata: text("metadata"), // JSON for campaign-specific settings (rate limiting, etc.)
});

// Enhanced segment table (aligned with Shopify customer segments)
export const segment = sqliteTable("segment", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),

  // Segment type and behavior
  type: text("type", { enum: segmentTypeEnum }).notNull().default("manual"),
  status: text("status", { enum: segmentStatusEnum })
    .notNull()
    .default("active"),

  // Shopify integration
  shopifySegmentId: text("shopifySegmentId"), // Maps to Shopify customer segment ID

  // Segment criteria (for automatic segments)
  query: text("query"), // JSON query object for filtering customers
  conditions: text("conditions"), // JSON array of filter conditions

  // Sync tracking
  lastSyncAt: normalizeDateNullable("lastSyncAt"), // Last time we synced with Shopify

  // Timestamps
  createdAt: normalizeDate("createdAt").notNull(),
  updatedAt: normalizeDate("updatedAt").notNull(),

  // Additional settings
  metadata: text("metadata"), // JSON for segment-specific data
});

// Relationship table for campaign-segment associations
export const campaignSegment = sqliteTable("campaign_segment", {
  id: text("id").primaryKey(),
  campaignId: text("campaignId")
    .notNull()
    .references(() => campaign.id, { onDelete: "cascade" }),
  segmentId: text("segmentId")
    .notNull()
    .references(() => segment.id, { onDelete: "cascade" }),
  createdAt: normalizeDate("createdAt").notNull(),
});

export const uniqueCampaignSegmentIndex = uniqueIndex(
  "unique_campaign_segment"
).on(campaignSegment.campaignId, campaignSegment.segmentId);

// Campaign-conversation registry for cross-DO relationship tracking
// Lightweight registry that only tracks the relationship between campaigns and conversations
// All conversation details (status, activity, etc.) live in the conversation DO as single source of truth
export const campaignConversation = sqliteTable("campaign_conversation", {
  id: text("id").primaryKey(),
  campaignId: text("campaignId")
    .notNull()
    .references(() => campaign.id, { onDelete: "cascade" }),
  conversationId: text("conversationId").notNull(), // ID of the conversation DO
  customerPhone: text("customerPhone").notNull(), // For quick identification and filtering

  // Registry timestamps - when relationship was established
  createdAt: normalizeDate("createdAt").notNull(),

  // Optional: Campaign-specific context that doesn't change
  metadata: text("metadata"), // JSON for campaign-specific conversation context (initial message template, etc.)
});

// Connected stores table - for Shopify, WooCommerce, etc.
export const connectedStore = sqliteTable("connected_store", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // 'shopify', 'woocommerce', etc.
  shopDomain: text("shopDomain").notNull().unique(), // Shop domain (unique within this org)
  scope: text("scope"), // OAuth scopes granted
  status: text("status").notNull().default("active"), // 'active', 'disconnected', 'error'
  connectedAt: normalizeDate("connectedAt").notNull(),
  lastSyncAt: normalizeDateNullable("lastSyncAt"), // Track when we last synced data
  metadata: text("metadata"), // JSON for store-specific data
  createdAt: normalizeDate("createdAt").notNull(),
});

// Customer table - for storing shoppers/customers that can be targeted in segments
export const customer = sqliteTable("customer", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  phone: text("phone"), // Optional phone number
  firstName: text("firstName"),
  lastName: text("lastName"),

  // Integration IDs for syncing with external platforms
  shopifyCustomerId: text("shopifyCustomerId"), // Shopify customer ID
  externalCustomerId: text("externalCustomerId"), // Other platform customer ID

  // Customer status and preferences
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'unsubscribed'
  optInSMS: text("optInSMS").notNull().default("false"), // SMS marketing consent
  optInEmail: text("optInEmail").notNull().default("false"), // Email marketing consent
  optInWhatsApp: text("optInWhatsApp").notNull().default("false"), // WhatsApp marketing consent

  // Customer attributes for segmentation
  tags: text("tags"), // JSON array of customer tags
  totalSpent: text("totalSpent"), // Total amount spent (stored as string for precision)
  orderCount: text("orderCount").default("0"), // Total number of orders
  lastOrderAt: normalizeDateNullable("lastOrderAt"), // Date of last order

  // Timestamps
  createdAt: normalizeDate("createdAt").notNull(),
  updatedAt: normalizeDate("updatedAt").notNull(),
  lastSyncAt: normalizeDateNullable("lastSyncAt"), // Last time synced from external platform

  // Additional customer data
  metadata: text("metadata"), // JSON for custom customer attributes
});

// Create unique index on email for this organization
export const uniqueCustomerEmailIndex = uniqueIndex("unique_customer_email").on(
  customer.email
);

// Junction table for segment-customer relationships (many-to-many)
export const segmentCustomer = sqliteTable("segment_customer", {
  id: text("id").primaryKey(),
  segmentId: text("segmentId")
    .notNull()
    .references(() => segment.id, { onDelete: "cascade" }),
  customerId: text("customerId")
    .notNull()
    .references(() => customer.id, { onDelete: "cascade" }),

  // Tracking who added the customer and how
  addedBy: text("addedBy"), // User ID who manually added this customer
  source: text("source").notNull().default("manual"), // 'manual', 'automatic', 'shopify_sync', 'import'

  // Timestamps
  addedAt: normalizeDate("addedAt").notNull(),

  // Optional: conditions that qualified this customer (for automatic segments)
  qualificationMetadata: text("qualificationMetadata"), // JSON with criteria that qualified them
});

// Ensure unique customer-segment pairs
export const uniqueSegmentCustomerIndex = uniqueIndex(
  "unique_segment_customer"
).on(segmentCustomer.segmentId, segmentCustomer.customerId);

// Member table (aligned with better-auth) - organization members
export const member = sqliteTable("member", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(), // ID from the gateway's user table
  role: text("role").notNull(), // e.g., 'owner', 'admin', 'member'
  createdAt: normalizeDate("createdAt").notNull(),
});

export const invitationStatusEnum = [
  "pending",
  "accepted",
  "expired",
  "revoked",
] as const;

// Invitation table (aligned with better-auth) - organization invitations
export const invitation = sqliteTable("invitation", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  inviterId: text("inviterId").notNull(), // ID from the gateway's user table
  role: text("role").notNull(),
  status: text("status", { enum: invitationStatusEnum })
    .notNull()
    .default("pending"),
  expiresAt: normalizeDate("expiresAt").notNull(),
  createdAt: normalizeDate("createdAt").notNull(),
});
