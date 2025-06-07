import { Schema as S } from "effect";
import { Data } from "effect";

// Branded types for type safety
export const MCPStoreDomain = S.String.pipe(
  S.pattern(/^[a-zA-Z0-9\-]+\.myshopify\.com$/),
  S.brand("MCPStoreDomain")
);
export type MCPStoreDomain = typeof MCPStoreDomain.Type;

export const ProductVariantId = S.String.pipe(
  S.minLength(1),
  S.brand("ProductVariantId")
);
export type ProductVariantId = typeof ProductVariantId.Type;

export const CartId = S.String.pipe(S.minLength(1), S.brand("CartId"));
export type CartId = typeof CartId.Type;

export const LineItemId = S.String.pipe(S.minLength(1), S.brand("LineItemId"));
export type LineItemId = typeof LineItemId.Type;

// Product search result schema
export const ProductSearchResultSchema = S.Struct({
  name: S.String,
  price: S.String,
  currency: S.String,
  variantId: ProductVariantId,
  productUrl: S.String,
  imageUrl: S.optional(S.String),
  description: S.optional(S.String),
});
export type ProductSearchResult = typeof ProductSearchResultSchema.Type;

// Policy search result schema
export const PolicySearchResultSchema = S.Struct({
  answer: S.String,
  source: S.optional(S.String),
});
export type PolicySearchResult = typeof PolicySearchResultSchema.Type;

// Cart item schema
export const CartItemSchema = S.Struct({
  variantId: ProductVariantId,
  quantity: S.Number.pipe(S.positive()),
  lineItemId: S.optional(LineItemId),
});
export type CartItem = typeof CartItemSchema.Type;

// Cart merchandise schema
export const CartMerchandiseSchema = S.Struct({
  product: S.Struct({
    title: S.String,
    handle: S.String,
  }),
  title: S.String,
  price: S.Struct({
    amount: S.String,
    currencyCode: S.String,
  }),
});

// Cart line schema
export const CartLineSchema = S.Struct({
  id: LineItemId,
  quantity: S.Number.pipe(S.positive()),
  merchandise: CartMerchandiseSchema,
});

// Cart result schema
export const CartResultSchema = S.Struct({
  id: CartId,
  checkoutUrl: S.String,
  lines: S.Array(CartLineSchema),
  cost: S.Struct({
    totalAmount: S.Struct({
      amount: S.String,
      currencyCode: S.String,
    }),
  }),
});
export type CartResult = typeof CartResultSchema.Type;

// MCP request/response schemas
export const MCPRequestSchema = S.Struct({
  jsonrpc: S.Literal("2.0"),
  id: S.String,
  method: S.String,
  params: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});

export const MCPErrorSchema = S.Struct({
  code: S.Number,
  message: S.String,
  data: S.optional(S.Unknown),
});

export const MCPResponseSchema = S.Struct({
  jsonrpc: S.Literal("2.0"),
  id: S.String,
  result: S.optional(S.Unknown),
  error: S.optional(MCPErrorSchema),
});

// Configuration schema
export const ShopifyMCPConfigSchema = S.Struct({
  storeDomain: MCPStoreDomain,
  mcpEndpoint: S.optional(S.String),
});
export type ShopifyMCPConfig = typeof ShopifyMCPConfigSchema.Type;

// Error types using Data.TaggedError
export class ShopifyMCPError extends Data.TaggedError("ShopifyMCPError")<{
  message: string;
  code?: number;
  cause?: unknown;
}> {}

export class MCPConnectionError extends Data.TaggedError("MCPConnectionError")<{
  message: string;
  storeDomain: MCPStoreDomain;
  cause?: unknown;
}> {}

export class MCPValidationError extends Data.TaggedError("MCPValidationError")<{
  message: string;
  field?: string;
  cause?: unknown;
}> {}

// Search query schemas for validation
export const CatalogSearchRequestSchema = S.Struct({
  query: S.String.pipe(S.minLength(1)),
  context: S.optional(S.String),
});

export const PolicySearchRequestSchema = S.Struct({
  query: S.String.pipe(S.minLength(1)),
  context: S.optional(S.String),
});

export const CartUpdateRequestSchema = S.Struct({
  cartId: S.optional(CartId),
  lines: S.Array(CartItemSchema),
});

// Helper functions for creating branded types
export const unsafeMCPStoreDomain = (domain: string): MCPStoreDomain =>
  domain as MCPStoreDomain;

export const unsafeProductVariantId = (id: string): ProductVariantId =>
  id as ProductVariantId;

export const unsafeCartId = (id: string): CartId => id as CartId;

export const unsafeLineItemId = (id: string): LineItemId => id as LineItemId;
