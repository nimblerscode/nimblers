import { Context, type Effect } from "effect";
import type { OrganizationSlug } from "@/domain/global/organization/models";
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
    readonly store: (nonce: Nonce) => Effect.Effect<void, OAuthError>;
    readonly verify: (
      nonce: Nonce
    ) => Effect.Effect<boolean, InvalidNonceError>;
    readonly consume: (nonce: Nonce) => Effect.Effect<void, InvalidNonceError>;
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
      organizationSlug: OrganizationSlug,
      shop: ShopDomain,
      token: AccessToken,
      scope: Scope
    ) => Effect.Effect<void, OAuthError>;
    readonly retrieve: (
      organizationSlug: OrganizationSlug,
      shop: ShopDomain
    ) => Effect.Effect<AccessToken | null, OAuthError>;
    readonly delete: (
      organizationSlug: OrganizationSlug,
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
      shop: ShopDomain
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
      organizationSlug: OrganizationSlug,
      request: Request
    ) => Effect.Effect<
      Response,
      OAuthError | InvalidHmacError | InvalidShopDomainError
    >;
    readonly handleCallback: (
      organizationSlug: OrganizationSlug,
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
      shop: ShopDomain,
      clientId: ClientId,
      scopes: Scope[],
      redirectUri: string,
      nonce: Nonce
    ) => Effect.Effect<string, OAuthError>;
    readonly checkConnectionStatus: (
      organizationSlug: OrganizationSlug,
      shop: ShopDomain
    ) => Effect.Effect<
      { connected: boolean; shop: ShopDomain; scope?: Scope },
      OAuthError
    >;
    readonly disconnect: (
      organizationSlug: OrganizationSlug,
      shop: ShopDomain
    ) => Effect.Effect<{ success: boolean }, OAuthError>;
    readonly registerWebhooksAfterInstall: (
      shop: ShopDomain,
      accessToken: AccessToken
    ) => Effect.Effect<void, OAuthError>;
  }
>() {}
