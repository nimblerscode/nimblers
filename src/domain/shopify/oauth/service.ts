import { Context, type Effect } from "effect";
import type {
  AccessToken,
  AccessTokenError,
  AccessTokenResponse,
  AuthorizationCode,
  ClientId,
  ClientSecret,
  InvalidHmacError,
  InvalidNonceError,
  InvalidShopDomainError,
  Nonce,
  OAuthCallbackRequest,
  OAuthError,
  OAuthInstallRequest,
  OnlineAccessTokenResponse,
  Scope,
  ShopDomain,
} from "./models";

// === HMAC Verification Service ===
export abstract class ShopifyOAuthHmacVerifier extends Context.Tag(
  "@core/shopify/oauth/HmacVerifier"
)<
  ShopifyOAuthHmacVerifier,
  {
    readonly verifyInstallRequest: (
      request: OAuthInstallRequest,
      secret: ClientSecret
    ) => Effect.Effect<boolean, InvalidHmacError>;
    readonly verifyCallbackRequest: (
      request: OAuthCallbackRequest,
      secret: ClientSecret
    ) => Effect.Effect<boolean, InvalidHmacError>;
  }
>() {}

// === Nonce Management Service ===
export abstract class NonceManager extends Context.Tag(
  "@core/shopify/oauth/NonceManager"
)<
  NonceManager,
  {
    readonly generate: () => Effect.Effect<Nonce, never>;
    readonly store: (
      organizationId: string,
      nonce: Nonce
    ) => Effect.Effect<void, OAuthError>;
    readonly verify: (
      organizationId: string,
      nonce: Nonce
    ) => Effect.Effect<boolean, InvalidNonceError>;
    readonly consume: (
      organizationId: string,
      nonce: Nonce
    ) => Effect.Effect<void, InvalidNonceError>;
  }
>() {}

// === Access Token Service ===
export abstract class AccessTokenService extends Context.Tag(
  "@core/shopify/oauth/AccessTokenService"
)<
  AccessTokenService,
  {
    readonly exchangeCodeForToken: (
      shop: ShopDomain,
      code: AuthorizationCode,
      clientId: ClientId,
      clientSecret: ClientSecret
    ) => Effect.Effect<
      AccessTokenResponse | OnlineAccessTokenResponse,
      AccessTokenError
    >;
    readonly store: (
      organizationId: string,
      shop: ShopDomain,
      token: AccessToken,
      scope: Scope
    ) => Effect.Effect<void, OAuthError>;
    readonly retrieve: (
      organizationId: string,
      shop: ShopDomain
    ) => Effect.Effect<AccessToken | null, OAuthError>;
    readonly delete: (
      organizationId: string,
      shop: ShopDomain
    ) => Effect.Effect<boolean, OAuthError>;
  }
>() {}

// === Webhook Service ===
export abstract class WebhookService extends Context.Tag(
  "@core/shopify/oauth/WebhookService"
)<
  WebhookService,
  {
    readonly registerAppUninstallWebhook: (
      shop: ShopDomain,
      accessToken: AccessToken,
      webhookUrl: string
    ) => Effect.Effect<void, OAuthError>;
  }
>() {}

// === Shop Validation Service ===
export abstract class ShopValidator extends Context.Tag(
  "@core/shopify/oauth/ShopValidator"
)<
  ShopValidator,
  {
    readonly validateShopDomain: (
      shop: string
    ) => Effect.Effect<ShopDomain, InvalidShopDomainError>;
  }
>() {}

// === OAuth Use Case ===
export abstract class ShopifyOAuthUseCase extends Context.Tag(
  "@core/shopify/oauth/UseCase"
)<
  ShopifyOAuthUseCase,
  {
    readonly handleInstallRequest: (
      organizationId: string,
      request: Request
    ) => Effect.Effect<
      Response,
      OAuthError | InvalidHmacError | InvalidShopDomainError
    >;
    readonly handleCallback: (
      organizationId: string,
      request: Request
    ) => Effect.Effect<
      Response,
      | OAuthError
      | InvalidHmacError
      | InvalidNonceError
      | AccessTokenError
      | InvalidShopDomainError
    >;
    readonly buildAuthorizationUrl: (
      organizationId: string,
      shop: ShopDomain,
      clientId: ClientId,
      scopes: Scope[],
      redirectUri: string,
      nonce: Nonce
    ) => Effect.Effect<string, OAuthError>;
    readonly checkConnectionStatus: (
      organizationId: string,
      shop: ShopDomain
    ) => Effect.Effect<
      { connected: boolean; shop: ShopDomain; scope?: Scope },
      OAuthError
    >;
    readonly disconnect: (
      organizationId: string,
      shop: ShopDomain
    ) => Effect.Effect<{ success: boolean }, OAuthError>;
    readonly registerWebhooksAfterInstall: (
      organizationId: string,
      shop: ShopDomain,
      accessToken: AccessToken
    ) => Effect.Effect<void, OAuthError>;
  }
>() {}
