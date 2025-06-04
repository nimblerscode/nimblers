import { Data, Schema as S } from "effect";

// === Branded Types ===
export const SegmentId = S.String.pipe(S.brand("SegmentId"));
export type SegmentId = S.Schema.Type<typeof SegmentId>;

export const ShopifySegmentId = S.String.pipe(S.brand("ShopifySegmentId"));
export type ShopifySegmentId = S.Schema.Type<typeof ShopifySegmentId>;

// === Segment Enums ===
export const SegmentStatus = S.Union(
  S.Literal("active"),
  S.Literal("paused"),
  S.Literal("archived")
);
export type SegmentStatus = S.Schema.Type<typeof SegmentStatus>;

export const SegmentType = S.Union(
  S.Literal("manual"),
  S.Literal("automatic"),
  S.Literal("shopify_sync")
);
export type SegmentType = S.Schema.Type<typeof SegmentType>;

// === Segment Query/Conditions ===
export const SegmentCondition = S.Struct({
  field: S.String, // e.g., "total_spent", "orders_count", "location", "tags"
  operator: S.Union(
    S.Literal("equals"),
    S.Literal("not_equals"),
    S.Literal("greater_than"),
    S.Literal("less_than"),
    S.Literal("contains"),
    S.Literal("not_contains"),
    S.Literal("in"),
    S.Literal("not_in")
  ),
  value: S.Union(S.String, S.Number, S.Array(S.String)),
});
export type SegmentCondition = S.Schema.Type<typeof SegmentCondition>;

export const SegmentQuery = S.Struct({
  conditions: S.Array(SegmentCondition),
  logic: S.optional(S.Union(S.Literal("AND"), S.Literal("OR"))),
});
export type SegmentQuery = S.Schema.Type<typeof SegmentQuery>;

// === Main Segment Schema ===
export const SegmentSchema = S.Struct({
  id: SegmentId,
  name: S.String.pipe(S.minLength(1), S.maxLength(255)),
  description: S.optional(S.String.pipe(S.maxLength(1000))),
  type: SegmentType,
  status: SegmentStatus,

  // Shopify integration
  shopifySegmentId: S.optional(ShopifySegmentId),

  // Segment criteria (for automatic segments)
  query: S.optional(SegmentQuery),

  // Sync tracking
  lastSyncAt: S.optional(S.Date),

  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
  createdAt: S.Date,
  updatedAt: S.Date,
});
export type Segment = S.Schema.Type<typeof SegmentSchema>;

// === Segment Creation Input ===
export const CreateSegmentInputSchema = S.Struct({
  name: S.String.pipe(S.minLength(1), S.maxLength(255)),
  description: S.optional(S.String.pipe(S.maxLength(1000))),
  type: SegmentType,
  query: S.optional(SegmentQuery),
  shopifySegmentId: S.optional(ShopifySegmentId),
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});
export type CreateSegmentInput = S.Schema.Type<typeof CreateSegmentInputSchema>;

// === Segment Update Input ===
export const UpdateSegmentInputSchema = S.Struct({
  name: S.optional(S.String.pipe(S.minLength(1), S.maxLength(255))),
  description: S.optional(S.String.pipe(S.maxLength(1000))),
  status: S.optional(SegmentStatus),
  query: S.optional(SegmentQuery),
  shopifySegmentId: S.optional(ShopifySegmentId),
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});
export type UpdateSegmentInput = S.Schema.Type<typeof UpdateSegmentInputSchema>;

// === Segment Customer Sync Input ===
export const SegmentSyncInputSchema = S.Struct({
  segmentId: SegmentId,
  forceSync: S.optional(S.Boolean),
});
export type SegmentSyncInput = S.Schema.Type<typeof SegmentSyncInputSchema>;

// === Segment Analytics (calculated on-demand) ===
export const SegmentAnalyticsSchema = S.Struct({
  segmentId: SegmentId,
  customerCount: S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0)), // Calculated from customer data
  campaignsUsing: S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0)), // Count of campaigns using this segment
  lastCalculatedAt: S.Date,
});
export type SegmentAnalytics = S.Schema.Type<typeof SegmentAnalyticsSchema>;

// === Error Types ===
export class SegmentNotFoundError extends Data.TaggedError(
  "SegmentNotFoundError"
)<{
  readonly segmentId: SegmentId;
  readonly message: string;
}> {}

export class SegmentValidationError extends Data.TaggedError(
  "SegmentValidationError"
)<{
  readonly message: string;
  readonly issues: readonly string[];
}> {}

export class SegmentDbError extends Data.TaggedError("SegmentDbError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class SegmentSyncError extends Data.TaggedError("SegmentSyncError")<{
  readonly segmentId: SegmentId;
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class ShopifySegmentNotFoundError extends Data.TaggedError(
  "ShopifySegmentNotFoundError"
)<{
  readonly shopifySegmentId: ShopifySegmentId;
  readonly message: string;
}> {}

export class InvalidSegmentQueryError extends Data.TaggedError(
  "InvalidSegmentQueryError"
)<{
  readonly segmentId: SegmentId;
  readonly query: SegmentQuery;
  readonly message: string;
}> {}

export class SegmentInUseError extends Data.TaggedError("SegmentInUseError")<{
  readonly segmentId: SegmentId;
  readonly campaignIds: readonly string[];
  readonly message: string;
}> {}

// === Union Type for All Segment Errors ===
export type SegmentError =
  | SegmentNotFoundError
  | SegmentValidationError
  | SegmentDbError
  | SegmentSyncError
  | ShopifySegmentNotFoundError
  | InvalidSegmentQueryError
  | SegmentInUseError;

// === Segment Type Configuration ===
export const SEGMENT_TYPE_CONFIG: Record<
  SegmentType,
  {
    supportsQuery: boolean;
    requiresShopifySync: boolean;
    autoUpdates: boolean;
    canBeDeleted: boolean;
  }
> = {
  manual: {
    supportsQuery: false,
    requiresShopifySync: false,
    autoUpdates: false,
    canBeDeleted: true,
  },
  automatic: {
    supportsQuery: true,
    requiresShopifySync: false,
    autoUpdates: true,
    canBeDeleted: true,
  },
  shopify_sync: {
    supportsQuery: false,
    requiresShopifySync: true,
    autoUpdates: true,
    canBeDeleted: false, // Synced from Shopify, can't be deleted locally
  },
} as const;

// === Common Segment Fields (aligned with Shopify) ===
export const SHOPIFY_SEGMENT_FIELDS = [
  "total_spent",
  "orders_count",
  "last_order_date",
  "first_order_date",
  "email",
  "phone",
  "accepts_marketing",
  "tags",
  "location.country",
  "location.province",
  "location.city",
  "created_at",
  "updated_at",
] as const;

export type ShopifySegmentField = (typeof SHOPIFY_SEGMENT_FIELDS)[number];
