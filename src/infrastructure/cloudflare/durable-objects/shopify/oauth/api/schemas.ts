import { Schema } from "effect";
import {
  AccessToken,
  AuthorizationCode,
  ClientId,
  ClientSecret,
  Nonce,
  Scope,
  ShopDomain,
} from "@/domain/global/shopify/oauth/models";

// Nonce schemas
const NonceGenerateResponseSchema = Schema.Struct({
  nonce: Schema.String,
});

const NonceRequestSchema = Schema.Struct({
  nonce: Nonce,
});

const NonceVerifyResponseSchema = Schema.Struct({
  valid: Schema.Boolean,
});

const NonceSuccessResponseSchema = Schema.Struct({
  success: Schema.Boolean,
});

// Token schemas
const TokenStoreRequestSchema = Schema.Struct({
  shop: ShopDomain,
  accessToken: AccessToken,
  scope: Scope,
});

const TokenRetrieveResponseSchema = Schema.Struct({
  accessToken: Schema.NullOr(Schema.String),
  scope: Schema.optional(Schema.String),
});

const TokenDeleteRequestSchema = Schema.Struct({
  shop: ShopDomain,
});

const TokenDeleteResponseSchema = Schema.Struct({
  success: Schema.Boolean,
  deleted: Schema.Boolean,
});

const TokenExchangeRequestSchema = Schema.Struct({
  shop: ShopDomain,
  code: AuthorizationCode,
  clientId: ClientId,
  clientSecret: ClientSecret,
});

// Export organized schemas
export const ShopifyOAuthApiSchemas = {
  // Nonce operations
  generateNonce: {
    response: NonceGenerateResponseSchema,
  },
  storeNonce: {
    request: NonceRequestSchema,
    response: NonceSuccessResponseSchema,
  },
  verifyNonce: {
    request: NonceRequestSchema,
    response: NonceVerifyResponseSchema,
  },
  consumeNonce: {
    request: NonceRequestSchema,
    response: NonceSuccessResponseSchema,
  },

  // Token operations
  storeToken: {
    request: TokenStoreRequestSchema,
    response: NonceSuccessResponseSchema,
  },
  retrieveToken: {
    response: TokenRetrieveResponseSchema,
  },
  deleteToken: {
    request: TokenDeleteRequestSchema,
    response: TokenDeleteResponseSchema,
  },
  exchangeToken: {
    request: TokenExchangeRequestSchema,
    response: Schema.Unknown, // Shopify's response format varies
  },
} as const;

// Export individual schemas for direct use
export {
  NonceGenerateResponseSchema,
  NonceRequestSchema,
  NonceVerifyResponseSchema,
  NonceSuccessResponseSchema,
  TokenStoreRequestSchema,
  TokenRetrieveResponseSchema,
  TokenDeleteRequestSchema,
  TokenDeleteResponseSchema,
  TokenExchangeRequestSchema,
};

// Type exports
export type NonceGenerateResponse = Schema.Schema.Type<
  typeof NonceGenerateResponseSchema
>;
export type NonceRequest = Schema.Schema.Type<typeof NonceRequestSchema>;
export type NonceVerifyResponse = Schema.Schema.Type<
  typeof NonceVerifyResponseSchema
>;
export type NonceSuccessResponse = Schema.Schema.Type<
  typeof NonceSuccessResponseSchema
>;
export type TokenStoreRequest = Schema.Schema.Type<
  typeof TokenStoreRequestSchema
>;
export type TokenRetrieveResponse = Schema.Schema.Type<
  typeof TokenRetrieveResponseSchema
>;
export type TokenDeleteRequest = Schema.Schema.Type<
  typeof TokenDeleteRequestSchema
>;
export type TokenDeleteResponse = Schema.Schema.Type<
  typeof TokenDeleteResponseSchema
>;
export type TokenExchangeRequest = Schema.Schema.Type<
  typeof TokenExchangeRequestSchema
>;
