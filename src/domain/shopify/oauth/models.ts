import { Schema as S } from "effect";

// === Branded Types ===
export const ShopDomain = S.String.pipe(
  S.pattern(
    /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.myshopify\.com$|^[a-zA-Z0-9]\.myshopify\.com$/,
  ),
  S.brand("ShopDomain"),
);
export type ShopDomain = S.Schema.Type<typeof ShopDomain>;

export const ClientId = S.String.pipe(S.brand("ClientId"));
export type ClientId = S.Schema.Type<typeof ClientId>;

export const ClientSecret = S.String.pipe(S.brand("ClientSecret"));
export type ClientSecret = S.Schema.Type<typeof ClientSecret>;

export const AuthorizationCode = S.String.pipe(S.brand("AuthorizationCode"));
export type AuthorizationCode = S.Schema.Type<typeof AuthorizationCode>;

export const AccessToken = S.String.pipe(S.brand("AccessToken"));
export type AccessToken = S.Schema.Type<typeof AccessToken>;

export const Nonce = S.String.pipe(S.brand("Nonce"));
export type Nonce = S.Schema.Type<typeof Nonce>;

export const Scope = S.String.pipe(S.brand("Scope"));
export type Scope = S.Schema.Type<typeof Scope>;

// === OAuth Request/Response Schemas ===
export const OAuthInstallRequestSchema = S.Struct({
  shop: ShopDomain,
  timestamp: S.String,
  hmac: S.String,
  embedded: S.optional(S.String),
});

export const OAuthCallbackRequestSchema = S.Struct({
  code: AuthorizationCode,
  hmac: S.String,
  shop: ShopDomain,
  state: Nonce,
  timestamp: S.String,
  host: S.optional(S.String),
});

export const AccessTokenResponseSchema = S.Struct({
  access_token: AccessToken,
  scope: Scope,
});

export const OnlineAccessTokenResponseSchema = S.Struct({
  access_token: AccessToken,
  scope: Scope,
  expires_in: S.Number,
  associated_user_scope: S.String,
  associated_user: S.Struct({
    id: S.Number,
    first_name: S.String,
    last_name: S.String,
    email: S.String,
    email_verified: S.Boolean,
    account_owner: S.Boolean,
    locale: S.String,
    collaborator: S.Boolean,
  }),
});

// === Error Types ===
export class InvalidShopDomainError extends S.TaggedError<InvalidShopDomainError>()(
  "InvalidShopDomainError",
  {
    message: S.String,
    shop: S.String, // Accept raw string since the shop domain is invalid
  },
) {}

export class InvalidHmacError extends S.TaggedError<InvalidHmacError>()(
  "InvalidHmacError",
  {
    message: S.String,
  },
) {}

export class InvalidNonceError extends S.TaggedError<InvalidNonceError>()(
  "InvalidNonceError",
  {
    message: S.String,
  },
) {}

export class OAuthError extends S.TaggedError<OAuthError>()("OAuthError", {
  message: S.String,
  cause: S.optional(S.Unknown),
}) {}

export class AccessTokenError extends S.TaggedError<AccessTokenError>()(
  "AccessTokenError",
  {
    message: S.String,
    cause: S.optional(S.Unknown),
  },
) {}

// === Type Exports ===
export type OAuthInstallRequest = S.Schema.Type<
  typeof OAuthInstallRequestSchema
>;
export type OAuthCallbackRequest = S.Schema.Type<
  typeof OAuthCallbackRequestSchema
>;
export type AccessTokenResponse = S.Schema.Type<
  typeof AccessTokenResponseSchema
>;
export type OnlineAccessTokenResponse = S.Schema.Type<
  typeof OnlineAccessTokenResponseSchema
>;
