import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import {
  ShopifyOAuthEnv,
  ShopifyOAuthUseCaseLive,
} from "../../../src/application/shopify/oauth/service";
import { EnvironmentConfigService } from "../../../src/domain/global/environment/service";
import type { OrganizationSlug } from "../../../src/domain/global/organization/models";
import type {
  AccessToken,
  ClientId,
  ClientSecret,
  Nonce,
  Scope,
  ShopDomain,
} from "../../../src/domain/shopify/oauth/models";
import {
  AccessTokenService,
  NonceManager,
  ShopifyOAuthHmacVerifier,
  ShopifyOAuthUseCase,
  ShopValidator,
  WebhookService,
} from "../../../src/domain/shopify/oauth/service";

describe("Shopify OAuth Routes", () => {
  const testOrganizationSlug = "test-org-123" as OrganizationSlug;
  const testEnv = {
    SHOPIFY_CLIENT_ID: "test_client_id" as ClientId,
    SHOPIFY_CLIENT_SECRET: "test_client_secret" as ClientSecret,
  };

  const testShop = "test-shop.myshopify.com" as ShopDomain;
  const testNonce = "test_nonce_123" as Nonce;
  const testToken = "shpat_test_token" as AccessToken;
  const testScope = "read_products,write_products" as Scope;

  // Mock layers
  const MockHmacVerifierValid = Layer.succeed(ShopifyOAuthHmacVerifier, {
    verifyInstallRequest: () => Effect.succeed(true),
    verifyCallbackRequest: () => Effect.succeed(true),
  });

  const MockNonceManagerValid = Layer.succeed(NonceManager, {
    generate: () => Effect.succeed(testNonce),
    store: (_nonce: Nonce) => Effect.succeed(void 0),
    verify: (_nonce: Nonce) => Effect.succeed(true),
    consume: (_nonce: Nonce) => Effect.succeed(void 0),
  });

  const MockAccessTokenServiceValid = Layer.succeed(AccessTokenService, {
    exchangeCodeForToken: () =>
      Effect.succeed({
        access_token: testToken,
        scope: testScope,
      }),
    store: (_shop, _token, _scope) => Effect.succeed(void 0),
    retrieve: (_shop) => Effect.succeed(testToken),
    delete: (_shop) => Effect.succeed(true),
  });

  const MockAccessTokenServiceEmpty = Layer.succeed(AccessTokenService, {
    exchangeCodeForToken: () =>
      Effect.succeed({
        access_token: testToken,
        scope: testScope,
      }),
    store: (_shop, _token, _scope) => Effect.succeed(void 0),
    retrieve: (_shop) => Effect.succeed(null),
    delete: (_shop) => Effect.succeed(true),
  });

  const MockShopValidatorValid = Layer.succeed(ShopValidator, {
    validateShopDomain: (shop: string) => Effect.succeed(shop as ShopDomain),
  });

  const MockWebhookService = Layer.succeed(WebhookService, {
    registerAppUninstallWebhook: () => Effect.succeed(void 0),
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
    getOrganizationUrl: (slug: OrganizationSlug) =>
      `http://localhost:5173/organization/${slug}`,
  });

  const MockEnvLayer = Layer.succeed(ShopifyOAuthEnv, testEnv);

  // Properly compose layers using Layer.mergeAll for dependencies and Layer.provide for the use case
  const BaseTestLayer = Layer.provide(
    ShopifyOAuthUseCaseLive,
    Layer.mergeAll(
      MockHmacVerifierValid,
      MockNonceManagerValid,
      MockShopValidatorValid,
      MockAccessTokenServiceEmpty,
      MockWebhookService,
      MockEnvironmentConfigService,
      MockEnvLayer,
    ),
  );

  const BaseTestLayerWithValidToken = Layer.provide(
    ShopifyOAuthUseCaseLive,
    Layer.mergeAll(
      MockHmacVerifierValid,
      MockNonceManagerValid,
      MockShopValidatorValid,
      MockAccessTokenServiceValid,
      MockWebhookService,
      MockEnvironmentConfigService,
      MockEnvLayer,
    ),
  );

  describe("OAuth Install Endpoint", () => {
    it.scoped("should handle GET /oauth/install with valid parameters", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/install");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("timestamp", "1234567890");
        url.searchParams.set("hmac", "valid_hmac");

        const request = new Request(url.toString(), { method: "GET" });
        const response = yield* useCase.handleInstallRequest(
          testOrganizationSlug,
          request,
        );

        expect(response.status).toBe(302);
        expect(response.headers.get("Location")).toContain(
          `https://${testShop}/admin/oauth/authorize`,
        );
      }).pipe(Effect.provide(BaseTestLayer)),
    );

    it.scoped("should handle POST /oauth/install with form data", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const formData = new FormData();
        formData.append("shop", testShop);
        formData.append("timestamp", "1234567890");
        formData.append("hmac", "valid_hmac");

        const request = new Request("https://example.com/oauth/install", {
          method: "POST",
          body: formData,
        });

        const response = yield* useCase.handleInstallRequest(
          testOrganizationSlug,
          request,
        );

        expect(response.status).toBe(302);
        expect(response.headers.get("Location")).toContain(
          `https://${testShop}/admin/oauth/authorize`,
        );
      }).pipe(Effect.provide(BaseTestLayer)),
    );

    it.scoped("should return 400 for missing shop parameter", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/install");
        url.searchParams.set("timestamp", "1234567890");
        url.searchParams.set("hmac", "valid_hmac");
        // Missing shop parameter

        const request = new Request(url.toString(), { method: "GET" });

        const result = yield* Effect.either(
          useCase.handleInstallRequest(testOrganizationSlug, request),
        );

        expect(result._tag).toBe("Left");
      }).pipe(Effect.provide(BaseTestLayer)),
    );

    it.scoped("should redirect to app if already connected", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/install");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("timestamp", "1234567890");
        url.searchParams.set("hmac", "valid_hmac");

        const request = new Request(url.toString(), { method: "GET" });
        const response = yield* useCase.handleInstallRequest(
          testOrganizationSlug,
          request,
        );

        expect(response.status).toBe(302);
        expect(response.headers.get("Location")).toBe(
          `http://localhost:5173/organization/${testOrganizationSlug}`,
        );
      }).pipe(Effect.provide(BaseTestLayerWithValidToken)),
    );

    it.scoped("should handle embedded app iframe escape", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/install");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("timestamp", "1234567890");
        url.searchParams.set("hmac", "valid_hmac");
        url.searchParams.set("embedded", "1");

        const request = new Request(url.toString(), { method: "GET" });
        const response = yield* useCase.handleInstallRequest(
          testOrganizationSlug,
          request,
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("text/html");

        const html = yield* Effect.tryPromise({
          try: () => response.text(),
          catch: () => new Error("Failed to read response"),
        });

        expect(html).toContain("app-bridge");
        expect(html).toContain(testEnv.SHOPIFY_CLIENT_ID);
      }).pipe(Effect.provide(BaseTestLayer)),
    );
  });

  describe("OAuth Callback Endpoint", () => {
    it.scoped("should handle valid OAuth callback", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/callback");
        url.searchParams.set("code", "valid_auth_code");
        url.searchParams.set("hmac", "valid_hmac");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("state", testNonce);
        url.searchParams.set("timestamp", "1234567890");

        const request = new Request(url.toString(), { method: "GET" });
        const response = yield* useCase.handleCallback(
          testOrganizationSlug,
          request,
        );

        expect(response.status).toBe(302);
        expect(response.headers.get("Location")).toBe(
          `http://localhost:5173/organization/${testOrganizationSlug}`,
        );
      }).pipe(Effect.provide(BaseTestLayerWithValidToken)),
    );

    it.scoped("should return 400 for missing callback parameters", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/callback");
        url.searchParams.set("hmac", "valid_hmac");
        url.searchParams.set("shop", testShop);
        // Missing code parameter

        const request = new Request(url.toString(), { method: "GET" });

        const result = yield* Effect.either(
          useCase.handleCallback(testOrganizationSlug, request),
        );

        expect(result._tag).toBe("Left");
      }).pipe(Effect.provide(BaseTestLayerWithValidToken)),
    );

    it.scoped("should handle POST callback requests", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const formData = new FormData();
        formData.append("code", "valid_auth_code");
        formData.append("hmac", "valid_hmac");
        formData.append("shop", testShop);
        formData.append("state", testNonce);
        formData.append("timestamp", "1234567890");

        const request = new Request("https://example.com/oauth/callback", {
          method: "POST",
          body: formData,
        });

        const response = yield* useCase.handleCallback(
          testOrganizationSlug,
          request,
        );

        expect(response.status).toBe(302);
        expect(response.headers.get("Location")).toBe(
          `http://localhost:5173/organization/${testOrganizationSlug}`,
        );
      }).pipe(Effect.provide(BaseTestLayerWithValidToken)),
    );
  });

  describe("Connection Status Endpoint", () => {
    it.scoped("should return connected status", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const status = yield* useCase.checkConnectionStatus(
          testOrganizationSlug,
          testShop,
        );

        expect(status.connected).toBe(true);
        expect(status.shop).toBe(testShop);
        expect(status.scope).toBeTruthy();
      }).pipe(Effect.provide(BaseTestLayerWithValidToken)),
    );

    it.scoped("should return disconnected status", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const status = yield* useCase.checkConnectionStatus(
          testOrganizationSlug,
          testShop,
        );

        expect(status.connected).toBe(false);
        expect(status.shop).toBe(testShop);
        expect(status.scope).toBeUndefined();
      }).pipe(Effect.provide(BaseTestLayer)),
    );

    it.scoped("should handle GET /status with shop parameter", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/status");
        url.searchParams.set("shop", testShop);

        // Simulate route handler logic
        const shop = url.searchParams.get("shop") as ShopDomain;
        expect(shop).toBe(testShop);

        const status = yield* useCase.checkConnectionStatus(
          testOrganizationSlug,
          shop,
        );
        expect(status.shop).toBe(testShop);
      }).pipe(Effect.provide(BaseTestLayerWithValidToken)),
    );
  });

  describe("Disconnect Endpoint", () => {
    it.scoped("should handle disconnect request", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const result = yield* useCase.disconnect(
          testOrganizationSlug,
          testShop,
        );

        expect(result.success).toBe(true);
      }).pipe(Effect.provide(BaseTestLayerWithValidToken)),
    );

    it.scoped("should handle POST /disconnect with shop parameter", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const formData = new FormData();
        formData.append("shop", testShop);

        // Simulate route handler extracting shop from form data
        const shop = formData.get("shop") as ShopDomain;
        expect(shop).toBe(testShop);

        const result = yield* useCase.disconnect(testOrganizationSlug, shop);
        expect(result.success).toBe(true);
      }).pipe(Effect.provide(BaseTestLayerWithValidToken)),
    );
  });

  describe("HTTP Method Validation", () => {
    it.scoped("should accept both GET and POST for install", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/install");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("timestamp", "1234567890");
        url.searchParams.set("hmac", "valid_hmac");

        // Test GET request
        const getRequest = new Request(url.toString(), { method: "GET" });
        const getResponse = yield* useCase.handleInstallRequest(
          testOrganizationSlug,
          getRequest,
        );
        expect([200, 302]).toContain(getResponse.status);

        // Test POST request
        const postRequest = new Request(url.toString(), { method: "POST" });
        const postResponse = yield* useCase.handleInstallRequest(
          testOrganizationSlug,
          postRequest,
        );
        expect([200, 302]).toContain(postResponse.status);
      }).pipe(Effect.provide(BaseTestLayer)),
    );

    it.scoped("should accept both GET and POST for callback", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/callback");
        url.searchParams.set("code", "valid_auth_code");
        url.searchParams.set("hmac", "valid_hmac");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("state", testNonce);
        url.searchParams.set("timestamp", "1234567890");

        // Test GET request
        const getRequest = new Request(url.toString(), { method: "GET" });
        const getResponse = yield* useCase.handleCallback(
          testOrganizationSlug,
          getRequest,
        );
        expect(getResponse.status).toBe(302);

        // Test POST request
        const postRequest = new Request(url.toString(), { method: "POST" });
        const postResponse = yield* useCase.handleCallback(
          testOrganizationSlug,
          postRequest,
        );
        expect(postResponse.status).toBe(302);
      }).pipe(Effect.provide(BaseTestLayerWithValidToken)),
    );
  });

  describe("Content-Type Handling", () => {
    it.scoped("should handle application/x-www-form-urlencoded", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const body = new URLSearchParams();
        body.append("shop", testShop);
        body.append("timestamp", "1234567890");
        body.append("hmac", "valid_hmac");

        const request = new Request("https://example.com/oauth/install", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });

        const response = yield* useCase.handleInstallRequest(
          testOrganizationSlug,
          request,
        );
        expect([200, 302]).toContain(response.status);
      }).pipe(Effect.provide(BaseTestLayer)),
    );

    it.scoped("should handle multipart/form-data", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const formData = new FormData();
        formData.append("shop", testShop);
        formData.append("timestamp", "1234567890");
        formData.append("hmac", "valid_hmac");

        const request = new Request("https://example.com/oauth/install", {
          method: "POST",
          body: formData,
        });

        const response = yield* useCase.handleInstallRequest(
          testOrganizationSlug,
          request,
        );
        expect([200, 302]).toContain(response.status);
      }).pipe(Effect.provide(BaseTestLayer)),
    );
  });

  describe("Response Headers", () => {
    it.scoped("should set correct headers for redirects", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/install");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("timestamp", "1234567890");
        url.searchParams.set("hmac", "valid_hmac");

        const request = new Request(url.toString(), { method: "GET" });
        const response = yield* useCase.handleInstallRequest(
          testOrganizationSlug,
          request,
        );

        expect(response.status).toBe(302);
        expect(response.headers.get("Location")).toBeTruthy();
        expect(response.headers.get("Cache-Control")).toBe("no-cache");
      }).pipe(Effect.provide(BaseTestLayer)),
    );

    it.scoped("should set correct headers for HTML responses", () =>
      Effect.gen(function* () {
        const useCase = yield* ShopifyOAuthUseCase;

        const url = new URL("https://example.com/oauth/install");
        url.searchParams.set("shop", testShop);
        url.searchParams.set("timestamp", "1234567890");
        url.searchParams.set("hmac", "valid_hmac");
        url.searchParams.set("embedded", "1");

        const request = new Request(url.toString(), { method: "GET" });
        const response = yield* useCase.handleInstallRequest(
          testOrganizationSlug,
          request,
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("text/html");
        expect(response.headers.get("X-Frame-Options")).toBe("ALLOWALL");
      }).pipe(Effect.provide(BaseTestLayer)),
    );
  });
});
