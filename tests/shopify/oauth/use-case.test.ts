import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import {
  ShopifyOAuthEnv,
  ShopifyOAuthUseCaseLive,
} from "../../../src/application/shopify/oauth/service";
import { EnvironmentConfigService } from "../../../src/domain/global/environment/service";
import {
  type AccessToken,
  AccessTokenError,
  type AuthorizationCode,
  type ClientId,
  type ClientSecret,
  InvalidHmacError,
  InvalidNonceError,
  InvalidShopDomainError,
  type Nonce,
  OAuthError,
  type Scope,
  type ShopDomain,
} from "../../../src/domain/shopify/oauth/models";
import {
  AccessTokenService,
  NonceManager,
  ShopifyOAuthHmacVerifier,
  ShopifyOAuthUseCase,
  ShopValidator,
  WebhookService,
} from "../../../src/domain/shopify/oauth/service";

type TestServices =
  | ShopifyOAuthUseCase
  | ShopifyOAuthHmacVerifier
  | NonceManager
  | AccessTokenService
  | ShopValidator
  | ShopifyOAuthEnv
  | WebhookService;

describe("Shopify OAuth Use Case", () => {
  const testOrganizationId = "test-org-123";
  const testEnv = {
    SHOPIFY_CLIENT_ID: "test_client_id" as ClientId,
    SHOPIFY_CLIENT_SECRET: "test_client_secret" as ClientSecret,
  };

  const testShop = "test-shop.myshopify.com" as ShopDomain;
  const testNonce = "test_nonce_123" as Nonce;
  const testCode = "test_auth_code" as AuthorizationCode;
  const testToken = "shpat_test_token" as AccessToken;
  const testScope = "read_products,write_products" as Scope;

  // Mock dependencies
  const MockHmacVerifierValid = Layer.succeed(ShopifyOAuthHmacVerifier, {
    verifyInstallRequest: () => Effect.succeed(true),
    verifyCallbackRequest: () => Effect.succeed(true),
  });

  const MockHmacVerifierInvalid = Layer.succeed(ShopifyOAuthHmacVerifier, {
    verifyInstallRequest: () => Effect.succeed(false),
    verifyCallbackRequest: () => Effect.succeed(false),
  });

  const MockNonceManagerValid = Layer.succeed(NonceManager, {
    generate: () => Effect.succeed(testNonce),
    store: (organizationId: string, nonce: Nonce) => Effect.succeed(void 0),
    verify: (organizationId: string, nonce: Nonce) => Effect.succeed(true),
    consume: (organizationId: string, nonce: Nonce) => Effect.succeed(void 0),
  });

  const MockNonceManagerInvalid = Layer.succeed(NonceManager, {
    generate: () => Effect.succeed(testNonce),
    store: (organizationId: string, nonce: Nonce) => Effect.succeed(void 0),
    verify: (organizationId: string, nonce: Nonce) => Effect.succeed(false),
    consume: (organizationId: string, nonce: Nonce) => Effect.succeed(void 0),
  });

  const MockAccessTokenServiceValid = Layer.succeed(AccessTokenService, {
    exchangeCodeForToken: () =>
      Effect.succeed({
        access_token: testToken,
        scope: testScope,
      }),
    store: (
      organizationId: string,
      shop: ShopDomain,
      token: AccessToken,
      scope: Scope
    ) => Effect.succeed(void 0),
    retrieve: (organizationId: string, shop: ShopDomain) =>
      Effect.succeed(testToken),
    delete: (organizationId: string, shop: ShopDomain) => Effect.succeed(true),
  });

  const MockAccessTokenServiceEmpty = Layer.succeed(AccessTokenService, {
    exchangeCodeForToken: () =>
      Effect.succeed({
        access_token: testToken,
        scope: testScope,
      }),
    store: (
      organizationId: string,
      shop: ShopDomain,
      token: AccessToken,
      scope: Scope
    ) => Effect.succeed(void 0),
    retrieve: (organizationId: string, shop: ShopDomain) =>
      Effect.succeed(null),
    delete: (organizationId: string, shop: ShopDomain) => Effect.succeed(true),
  });

  const MockShopValidatorValid = Layer.succeed(ShopValidator, {
    validateShopDomain: (shop: string) => Effect.succeed(shop as ShopDomain),
  });

  const MockShopValidatorInvalid = Layer.succeed(ShopValidator, {
    validateShopDomain: (shop: string) =>
      Effect.fail(
        new InvalidShopDomainError({
          message: "Invalid shop domain",
          shop,
        })
      ),
  });

  const MockEnvLayer = Layer.succeed(ShopifyOAuthEnv, testEnv);

  const MockWebhookServiceValid = Layer.succeed(WebhookService, {
    registerAppUninstallWebhook: () => Effect.succeed(void 0),
  });

  const MockWebhookServiceFailing = Layer.succeed(WebhookService, {
    registerAppUninstallWebhook: () =>
      Effect.fail(
        new OAuthError({
          message: "Webhook registration failed",
        })
      ),
  });

  const MockEnvironmentConfigService = Layer.succeed(EnvironmentConfigService, {
    getEnvironment: () => "development" as const,
    getBaseUrl: () => "http://localhost:5173",
    getShopifyOAuthCallbackUrl: () =>
      "http://localhost:5173/shopify/oauth/callback",
    getShopifyWebhookUrl: (path: string) => `http://localhost:5173${path}`,
    getInvitationUrl: (token: string) =>
      `http://localhost:5173/invite/${token}`,
    getVerificationUrl: (token: string) =>
      `http://localhost:5173/verify?token=${token}`,
    getOrganizationUrl: (slug: string) => `http://localhost:5173/${slug}`,
  });

  // Create a comprehensive base layer with all dependencies using Layer.provide
  const BaseTestLayer = Layer.provide(
    ShopifyOAuthUseCaseLive,
    Layer.mergeAll(
      MockHmacVerifierValid,
      MockNonceManagerValid,
      MockAccessTokenServiceEmpty,
      MockShopValidatorValid,
      MockWebhookServiceValid,
      MockEnvLayer,
      MockEnvironmentConfigService
    )
  );

  const BaseTestLayerWithValidToken = Layer.provide(
    ShopifyOAuthUseCaseLive,
    Layer.mergeAll(
      MockHmacVerifierValid,
      MockNonceManagerValid,
      MockAccessTokenServiceValid,
      MockShopValidatorValid,
      MockWebhookServiceValid,
      MockEnvLayer,
      MockEnvironmentConfigService
    )
  );

  const BaseTestLayerWithInvalidHmac = Layer.provide(
    ShopifyOAuthUseCaseLive,
    Layer.mergeAll(
      MockHmacVerifierInvalid,
      MockNonceManagerValid,
      MockAccessTokenServiceEmpty,
      MockShopValidatorValid,
      MockWebhookServiceValid,
      MockEnvLayer,
      MockEnvironmentConfigService
    )
  );

  const BaseTestLayerWithInvalidShop = Layer.provide(
    ShopifyOAuthUseCaseLive,
    Layer.mergeAll(
      MockHmacVerifierValid,
      MockNonceManagerValid,
      MockAccessTokenServiceEmpty,
      MockShopValidatorInvalid,
      MockWebhookServiceValid,
      MockEnvLayer,
      MockEnvironmentConfigService
    )
  );

  const BaseTestLayerWithInvalidNonce = Layer.provide(
    ShopifyOAuthUseCaseLive,
    Layer.mergeAll(
      MockHmacVerifierValid,
      MockNonceManagerInvalid,
      MockAccessTokenServiceEmpty,
      MockShopValidatorValid,
      MockWebhookServiceValid,
      MockEnvLayer,
      MockEnvironmentConfigService
    )
  );

  const BaseTestLayerWithEmptySecret = Layer.provide(
    ShopifyOAuthUseCaseLive,
    Layer.mergeAll(
      MockHmacVerifierValid,
      MockNonceManagerValid,
      MockAccessTokenServiceEmpty,
      MockShopValidatorValid,
      MockWebhookServiceValid,
      Layer.succeed(ShopifyOAuthEnv, {
        SHOPIFY_CLIENT_ID: testEnv.SHOPIFY_CLIENT_ID,
        SHOPIFY_CLIENT_SECRET: "", // Empty secret
      }),
      MockEnvironmentConfigService
    )
  );

  const BaseTestLayerWithFailingTokenService = Layer.provide(
    ShopifyOAuthUseCaseLive,
    Layer.mergeAll(
      MockHmacVerifierValid,
      MockNonceManagerValid,
      Layer.succeed(AccessTokenService, {
        exchangeCodeForToken: () =>
          Effect.fail(
            new AccessTokenError({
              message: "Token exchange failed",
            })
          ),
        store: (
          organizationId: string,
          shop: ShopDomain,
          token: AccessToken,
          scope: Scope
        ) => Effect.succeed(void 0),
        retrieve: (organizationId: string, shop: ShopDomain) =>
          Effect.succeed(null),
        delete: (organizationId: string, shop: ShopDomain) =>
          Effect.succeed(true),
      }),
      MockShopValidatorValid,
      MockWebhookServiceValid,
      MockEnvLayer,
      MockEnvironmentConfigService
    )
  );

  const BaseTestLayerWithFailingAccessTokenService = Layer.provide(
    ShopifyOAuthUseCaseLive,
    Layer.mergeAll(
      MockHmacVerifierValid,
      MockNonceManagerValid,
      Layer.succeed(AccessTokenService, {
        exchangeCodeForToken: () =>
          Effect.succeed({
            access_token: testToken,
            scope: testScope,
          }),
        store: (
          organizationId: string,
          shop: ShopDomain,
          token: AccessToken,
          scope: Scope
        ) => Effect.succeed(void 0),
        retrieve: (organizationId: string, shop: ShopDomain) =>
          Effect.fail(
            new OAuthError({
              message: "Database error",
            })
          ),
        delete: (organizationId: string, shop: ShopDomain) =>
          Effect.succeed(true),
      }),
      MockShopValidatorValid,
      MockWebhookServiceValid,
      MockEnvLayer,
      MockEnvironmentConfigService
    )
  );

  describe("handleInstallRequest", () => {
    it.scoped(
      "should handle valid install request and redirect to Shopify",
      () =>
        Effect.gen(function* () {
          const useCase = yield* ShopifyOAuthUseCase;

          // Create a valid install request URL
          const url = new URL("https://example.com/oauth/install");
          url.searchParams.set("shop", testShop);
          url.searchParams.set("timestamp", "1234567890");
          url.searchParams.set("hmac", "valid_hmac");

          const request = new Request(url.toString());

          const response = yield* useCase.handleInstallRequest(
            testOrganizationId,
            request
          );

          expect(response.status).toBe(302);

          const location = response.headers.get("Location");
          expect(location).toContain(
            `https://${testShop}/admin/oauth/authorize`
          );
          expect(location).toContain(`client_id=${testEnv.SHOPIFY_CLIENT_ID}`);
          expect(location).toContain(`state=${testNonce}`);
        }).pipe(Effect.provide(BaseTestLayer))
    );

    it.scoped("should redirect to app if token already exists", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/install");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("timestamp", "1234567890");
        url.searchParams.set("hmac", "valid_hmac");

        const request = new Request(url.toString());

        const response = yield* useCase.handleInstallRequest(
          testOrganizationId,
          request
        );

        expect(response.status).toBe(302);
        expect(response.headers.get("Location")).toBe(
          `https://${testShop}/admin/apps`
        );
      }).pipe(Effect.provide(BaseTestLayerWithValidToken))
    );

    it.scoped(
      "should handle embedded app install request with iframe escape",
      () =>
        Effect.gen(function* () {
          const useCase = yield* ShopifyOAuthUseCase;

          const url = new URL("https://example.com/oauth/install");
          url.searchParams.set("shop", testShop);
          url.searchParams.set("timestamp", "1234567890");
          url.searchParams.set("hmac", "valid_hmac");
          url.searchParams.set("embedded", "1");

          const request = new Request(url.toString());

          const response = yield* useCase.handleInstallRequest(
            testOrganizationId,
            request
          );

          expect(response.status).toBe(200);
          expect(response.headers.get("Content-Type")).toBe("text/html");

          const html = yield* Effect.tryPromise({
            try: () => response.text(),
            catch: () => new Error("Failed to read response text"),
          });

          expect(html).toContain("app-bridge");
          expect(html).toContain(testEnv.SHOPIFY_CLIENT_ID);
        }).pipe(Effect.provide(BaseTestLayer))
    );

    it.scoped("should reject install request with invalid HMAC", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/install");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("timestamp", "1234567890");
        url.searchParams.set("hmac", "invalid_hmac");

        const request = new Request(url.toString());

        const result = yield* Effect.either(
          useCase.handleInstallRequest(testOrganizationId, request)
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidHmacError);
        }
      }).pipe(Effect.provide(BaseTestLayerWithInvalidHmac))
    );

    it.scoped("should reject install request with invalid shop domain", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/install");
        url.searchParams.set("shop", "invalid-shop.com");
        url.searchParams.set("timestamp", "1234567890");
        url.searchParams.set("hmac", "valid_hmac");

        const request = new Request(url.toString());

        const result = yield* Effect.either(
          useCase.handleInstallRequest(testOrganizationId, request)
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
        }
      }).pipe(Effect.provide(BaseTestLayerWithInvalidShop))
    );

    it.scoped("should fail when client secret is missing", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/install");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("timestamp", "1234567890");
        url.searchParams.set("hmac", "valid_hmac");

        const request = new Request(url.toString());

        const result = yield* Effect.either(
          useCase.handleInstallRequest(testOrganizationId, request)
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(OAuthError);
          expect(result.left.message).toContain(
            "Missing Shopify client secret"
          );
        }
      }).pipe(Effect.provide(BaseTestLayerWithEmptySecret))
    );
  });

  describe("handleCallback", () => {
    it.scoped("should handle valid OAuth callback", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/callback");
        url.searchParams.set("code", testCode);
        url.searchParams.set("hmac", "valid_hmac");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("state", testNonce);
        url.searchParams.set("timestamp", "1234567890");

        const request = new Request(url.toString());

        const response = yield* useCase.handleCallback(
          testOrganizationId,
          request
        );

        expect(response.status).toBe(302);
        expect(response.headers.get("Location")).toBe(
          `https://${testShop}/admin/apps`
        );
      }).pipe(Effect.provide(BaseTestLayerWithValidToken))
    );

    it.scoped("should reject callback with invalid HMAC", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/callback");
        url.searchParams.set("code", testCode);
        url.searchParams.set("hmac", "invalid_hmac");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("state", testNonce);
        url.searchParams.set("timestamp", "1234567890");

        const request = new Request(url.toString());

        const result = yield* Effect.either(
          useCase.handleCallback(testOrganizationId, request)
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidHmacError);
        }
      }).pipe(Effect.provide(BaseTestLayerWithInvalidHmac))
    );

    it.scoped("should reject callback with invalid nonce", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/callback");
        url.searchParams.set("code", testCode);
        url.searchParams.set("hmac", "valid_hmac");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("state", "invalid_nonce");
        url.searchParams.set("timestamp", "1234567890");

        const request = new Request(url.toString());

        const result = yield* Effect.either(
          useCase.handleCallback(testOrganizationId, request)
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidNonceError);
        }
      }).pipe(Effect.provide(BaseTestLayerWithInvalidNonce))
    );

    it.scoped("should reject callback with invalid shop domain", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/callback");
        url.searchParams.set("code", testCode);
        url.searchParams.set("hmac", "valid_hmac");
        url.searchParams.set("shop", "invalid-shop.com");
        url.searchParams.set("state", testNonce);
        url.searchParams.set("timestamp", "1234567890");

        const request = new Request(url.toString());

        const result = yield* Effect.either(
          useCase.handleCallback(testOrganizationId, request)
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
        }
      }).pipe(Effect.provide(BaseTestLayerWithInvalidShop))
    );

    it.scoped("should handle token exchange failure", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/callback");
        url.searchParams.set("code", testCode);
        url.searchParams.set("hmac", "valid_hmac");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("state", testNonce);
        url.searchParams.set("timestamp", "1234567890");

        const request = new Request(url.toString());

        const result = yield* Effect.either(
          useCase.handleCallback(testOrganizationId, request)
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(AccessTokenError);
        }
      }).pipe(Effect.provide(BaseTestLayerWithFailingTokenService))
    );
  });

  describe("buildAuthorizationUrl", () => {
    it.scoped("should build correct authorization URL", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const clientId = testEnv.SHOPIFY_CLIENT_ID;
        const scopes = ["read_products", "write_products"] as Scope[];
        const redirectUri = "https://example.com/oauth/callback";

        const authUrl = yield* useCase.buildAuthorizationUrl(
          testOrganizationId,
          testShop,
          clientId,
          scopes,
          redirectUri,
          testNonce
        );

        expect(authUrl).toContain(`https://${testShop}/admin/oauth/authorize`);
        expect(authUrl).toContain(`client_id=${clientId}`);
        expect(authUrl).toContain(`scope=${scopes.join(",")}`);
        expect(authUrl).toContain(
          `redirect_uri=${encodeURIComponent(redirectUri)}`
        );
        expect(authUrl).toContain(`state=${testNonce}`);
      }).pipe(Effect.provide(BaseTestLayer))
    );

    it.scoped("should handle special characters in redirect URI", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const redirectUri =
          "https://example.com/oauth/callback?param=value&other=test";

        const authUrl = yield* useCase.buildAuthorizationUrl(
          testOrganizationId,
          testShop,
          testEnv.SHOPIFY_CLIENT_ID,
          ["read_products"] as Scope[],
          redirectUri,
          testNonce
        );

        expect(authUrl).toContain(
          `redirect_uri=${encodeURIComponent(redirectUri)}`
        );
      }).pipe(Effect.provide(BaseTestLayer))
    );
  });

  describe("checkConnectionStatus", () => {
    it.scoped("should return connected status when token exists", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const status = yield* useCase.checkConnectionStatus(
          testOrganizationId,
          testShop
        );

        expect(status.connected).toBe(true);
        expect(status.shop).toBe(testShop);
        expect(status.scope).toBe("read_products,write_products");
      }).pipe(Effect.provide(BaseTestLayerWithValidToken))
    );

    it.scoped("should return disconnected status when no token exists", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const status = yield* useCase.checkConnectionStatus(
          testOrganizationId,
          testShop
        );

        expect(status.connected).toBe(false);
        expect(status.shop).toBe(testShop);
        expect(status.scope).toBeUndefined();
      }).pipe(Effect.provide(BaseTestLayer))
    );

    it.scoped("should handle access token service errors", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const result = yield* Effect.either(
          useCase.checkConnectionStatus(testOrganizationId, testShop)
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(OAuthError);
          expect(result.left.message).toContain(
            "Failed to check connection status"
          );
        }
      }).pipe(Effect.provide(BaseTestLayerWithFailingAccessTokenService))
    );
  });

  describe("disconnect", () => {
    it.scoped("should return success for disconnect operation", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const result = yield* useCase.disconnect(testOrganizationId, testShop);

        expect(result.success).toBe(true);
      }).pipe(Effect.provide(BaseTestLayerWithValidToken))
    );
  });

  describe("Error Handling", () => {
    it.scoped("should handle malformed install request parameters", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        // Missing required parameters
        const url = new URL("https://example.com/oauth/install");
        // No shop parameter
        url.searchParams.set("timestamp", "1234567890");
        url.searchParams.set("hmac", "valid_hmac");

        const request = new Request(url.toString());

        const result = yield* Effect.either(
          useCase.handleInstallRequest(testOrganizationId, request)
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(OAuthError);
          expect(result.left.message).toContain(
            "Invalid install request parameters"
          );
        }
      }).pipe(Effect.provide(BaseTestLayer))
    );

    it.scoped("should handle malformed callback request parameters", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        // Missing required parameters
        const url = new URL("https://example.com/oauth/callback");
        // No code parameter
        url.searchParams.set("hmac", "valid_hmac");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("state", testNonce);
        url.searchParams.set("timestamp", "1234567890");

        const request = new Request(url.toString());

        const result = yield* Effect.either(
          useCase.handleCallback(testOrganizationId, request)
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(OAuthError);
          expect(result.left.message).toContain(
            "Invalid callback request parameters"
          );
        }
      }).pipe(Effect.provide(BaseTestLayer))
    );
  });

  describe("registerWebhooksAfterInstall", () => {
    it.scoped(
      "should successfully register webhook with valid parameters",
      () =>
        Effect.gen(function* () {
          const useCase = yield* ShopifyOAuthUseCase;

          const result = yield* useCase.registerWebhooksAfterInstall(
            testOrganizationId,
            testShop,
            testToken
          );

          // Should complete without throwing
          expect(result).toBeUndefined();
        }).pipe(Effect.provide(BaseTestLayerWithValidToken))
    );

    it.scoped("should handle webhook registration failure", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const result = yield* Effect.either(
          useCase.registerWebhooksAfterInstall(
            testOrganizationId,
            testShop,
            testToken
          )
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(OAuthError);
          expect(result.left.message).toContain("Webhook registration failed");
        }
      }).pipe(
        Effect.provide(
          Layer.provide(
            ShopifyOAuthUseCaseLive,
            Layer.mergeAll(
              MockHmacVerifierValid,
              MockNonceManagerValid,
              MockAccessTokenServiceValid,
              MockShopValidatorValid,
              MockWebhookServiceFailing,
              MockEnvLayer,
              MockEnvironmentConfigService
            )
          )
        )
      )
    );
  });

  describe("Integration - OAuth Callback with Webhook Registration", () => {
    const IntegrationTestLayer = Layer.provide(
      ShopifyOAuthUseCaseLive,
      Layer.mergeAll(
        MockHmacVerifierValid,
        MockNonceManagerValid,
        MockAccessTokenServiceValid,
        MockShopValidatorValid,
        Layer.succeed(WebhookService, {
          registerAppUninstallWebhook: () => {
            return Effect.succeed(void 0);
          },
        }),
        MockEnvLayer,
        MockEnvironmentConfigService
      )
    );

    const IntegrationTestLayerWithFailingWebhook = Layer.provide(
      ShopifyOAuthUseCaseLive,
      Layer.mergeAll(
        MockHmacVerifierValid,
        MockNonceManagerValid,
        MockAccessTokenServiceValid,
        MockShopValidatorValid,
        MockWebhookServiceFailing,
        MockEnvLayer,
        MockEnvironmentConfigService
      )
    );

    it.scoped("should register webhook after successful OAuth callback", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/callback");
        url.searchParams.set("code", testCode);
        url.searchParams.set("hmac", "valid_hmac");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("state", testNonce);
        url.searchParams.set("timestamp", "1234567890");

        const request = new Request(url.toString());

        const response = yield* useCase.handleCallback(
          testOrganizationId,
          request
        );

        expect(response.status).toBe(302);
        expect(response.headers.get("Location")).toBe(
          `https://${testShop}/admin/apps`
        );

        // If we reach here, webhook registration succeeded (no exception thrown)
      }).pipe(Effect.provide(BaseTestLayerWithValidToken))
    );

    it.scoped("should handle webhook failure during OAuth callback", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/callback");
        url.searchParams.set("code", testCode);
        url.searchParams.set("hmac", "valid_hmac");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("state", testNonce);
        url.searchParams.set("timestamp", "1234567890");

        const request = new Request(url.toString());

        const result = yield* Effect.either(
          useCase.handleCallback(testOrganizationId, request)
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(OAuthError);
          expect(result.left.message).toContain("Webhook registration failed");
        }
      }).pipe(Effect.provide(IntegrationTestLayerWithFailingWebhook))
    );
  });
});
