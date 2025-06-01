import { Schema as S } from "effect";

// === Branded Types ===
export const StoreId = S.String.pipe(S.brand("StoreId"));
export type StoreId = S.Schema.Type<typeof StoreId>;

export const OrganizationId = S.String.pipe(S.brand("OrganizationId"));
export type OrganizationId = S.Schema.Type<typeof OrganizationId>;

export const ShopDomain = S.String.pipe(
  S.pattern(
    /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.myshopify\.com$|^[a-zA-Z0-9]\.myshopify\.com$/
  ),
  S.brand("ShopDomain")
);
export type ShopDomain = S.Schema.Type<typeof ShopDomain>;

// === Store Connection Status ===
export const StoreConnectionStatus = S.Union(
  S.Literal("active"),
  S.Literal("disconnected"),
  S.Literal("error"),
  S.Literal("pending")
);
export type StoreConnectionStatus = S.Schema.Type<typeof StoreConnectionStatus>;

// === Connected Store Schema ===
export const ConnectedStoreSchema = S.Struct({
  id: StoreId,
  organizationId: OrganizationId,
  shopDomain: ShopDomain,
  scope: S.NullOr(S.String),
  status: StoreConnectionStatus,
  connectedAt: S.Date,
  lastSyncAt: S.NullOr(S.Date),
  metadata: S.NullOr(S.String), // JSON string for additional store metadata
  createdAt: S.Date,
});

export const NewConnectedStoreSchema = S.Struct({
  organizationId: OrganizationId,
  shopDomain: ShopDomain,
  scope: S.NullOr(S.String),
  status: StoreConnectionStatus,
  connectedAt: S.Date,
  lastSyncAt: S.NullOr(S.Date),
  metadata: S.NullOr(S.String),
});

// === Error Types ===
export class StoreNotFoundError extends S.TaggedError<StoreNotFoundError>()(
  "StoreNotFoundError",
  {
    message: S.String,
    storeId: S.optional(StoreId),
    shopDomain: S.optional(ShopDomain),
  }
) {}

export class StoreConnectionError extends S.TaggedError<StoreConnectionError>()(
  "StoreConnectionError",
  {
    message: S.String,
    shopDomain: ShopDomain,
    cause: S.optional(S.Unknown),
  }
) {}

export class StoreAlreadyConnectedError extends S.TaggedError<StoreAlreadyConnectedError>()(
  "StoreAlreadyConnectedError",
  {
    message: S.String,
    shopDomain: ShopDomain,
    connectedToOrganization: S.optional(OrganizationId),
    cause: S.optional(S.Unknown),
  }
) {}

export class StoreDbError extends S.TaggedError<StoreDbError>()(
  "StoreDbError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  }
) {}

// === Type Exports ===
export type ConnectedStore = S.Schema.Type<typeof ConnectedStoreSchema>;
export type NewConnectedStore = S.Schema.Type<typeof NewConnectedStoreSchema>;
