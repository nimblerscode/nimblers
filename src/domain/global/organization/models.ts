import { Schema as S } from "effect";

// Organization Models
export const OrganizationId = S.String.pipe(S.brand("OrganizationId"));
export type OrganizationId = S.Schema.Type<typeof OrganizationId>;

export const OrganizationSlug = S.String.pipe(S.brand("OrganizationSlug"));
export type OrganizationSlug = S.Schema.Type<typeof OrganizationSlug>;

export const Organization = S.Struct({
  id: OrganizationId,
  slug: OrganizationSlug,
  status: S.Literal("active", "archived"),
  createdAt: S.Date,
  updatedAt: S.Date,
});
export type Organization = S.Schema.Type<typeof Organization>;

// Global Shop Connection Models
export const ShopDomain = S.String.pipe(S.brand("ShopDomain"));
export type ShopDomain = S.Schema.Type<typeof ShopDomain>;

export const ShopConnection = S.Struct({
  shopDomain: ShopDomain,
  organizationId: OrganizationId,
  type: S.Literal("shopify", "woocommerce"),
  status: S.Literal("active", "disconnected"),
  connectedAt: S.Date,
  createdAt: S.Date,
  updatedAt: S.Date,
});
export type ShopConnection = S.Schema.Type<typeof ShopConnection>;

export const NewShopConnection = S.Struct({
  shopDomain: ShopDomain,
  organizationId: OrganizationId,
  type: S.Literal("shopify", "woocommerce"),
  status: S.Literal("active", "disconnected"),
  connectedAt: S.Date,
});
export type NewShopConnection = S.Schema.Type<typeof NewShopConnection>;

// Error Models
export class ShopConnectionError extends S.TaggedError<ShopConnectionError>()(
  "ShopConnectionError",
  {
    message: S.String,
    shopDomain: ShopDomain,
    cause: S.optional(S.Unknown),
  }
) {}

export class ShopAlreadyConnectedError extends S.TaggedError<ShopAlreadyConnectedError>()(
  "ShopAlreadyConnectedError",
  {
    message: S.String,
    shopDomain: ShopDomain,
    connectedToOrganization: OrganizationId,
    cause: S.optional(S.Unknown),
  }
) {}
