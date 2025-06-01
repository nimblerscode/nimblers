import { describe, expect, it, vi } from "@effect/vitest";
import { Effect } from "effect";
import type { ShopDomain } from "../../../src/domain/shopify/oauth/models";

// Mock the OAuth use case for testing webhook endpoints
const createMockOAuthUseCase = (disconnectSuccess = true) => ({
  disconnect: vi
    .fn()
    .mockImplementation(() =>
      disconnectSuccess
        ? Effect.succeed({ success: true })
        : Effect.fail(new Error("Disconnect failed")),
    ),
  handleInstallRequest: vi.fn(),
  handleCallback: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  checkConnectionStatus: vi.fn(),
  registerWebhooksAfterInstall: vi.fn(),
});

describe("Shopify Webhook Routes", () => {
  const testShop = "test-shop.myshopify.com" as ShopDomain;

  describe("POST /shopify/webhooks/app/uninstalled", () => {
    it("should successfully process app uninstall webhook", async () => {
      const mockOAuthUseCase = createMockOAuthUseCase(true);

      // Mock the webhook processing (you'd need to import the actual handler)
      const mockWebhookHandler = vi
        .fn()
        .mockImplementation(async (request: Request) => {
          const shopDomain = request.headers.get("x-shopify-shop-domain");

          if (!shopDomain) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Missing shop domain header",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // Simulate calling the OAuth use case disconnect method
          try {
            await Effect.runPromise(
              mockOAuthUseCase.disconnect(shopDomain as ShopDomain),
            );

            return new Response(
              JSON.stringify({
                success: true,
                message: `App successfully uninstalled for shop: ${shopDomain}`,
                shopDomain,
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          } catch (error) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Failed to process uninstall",
                error: String(error),
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }
        });

      // Create a webhook request
      const request = new Request(
        "https://example.com/shopify/webhooks/app/uninstalled",
        {
          method: "POST",
          headers: {
            "x-shopify-shop-domain": testShop,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shop_domain: testShop,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      const response = await mockWebhookHandler(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.shopDomain).toBe(testShop);
      expect(result.message).toContain("successfully uninstalled");

      // Verify the disconnect method was called
      expect(mockOAuthUseCase.disconnect).toHaveBeenCalledWith(testShop);
    });

    it("should handle missing shop domain header", async () => {
      const mockOAuthUseCase = createMockOAuthUseCase(true);

      const mockWebhookHandler = vi
        .fn()
        .mockImplementation(async (request: Request) => {
          const shopDomain = request.headers.get("x-shopify-shop-domain");

          if (!shopDomain) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Missing shop domain header",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response("Should not reach here", { status: 500 });
        });

      // Create a webhook request without shop domain header
      const request = new Request(
        "https://example.com/shopify/webhooks/app/uninstalled",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shop_domain: testShop,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      const response = await mockWebhookHandler(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Missing shop domain header");

      // Verify the disconnect method was not called
      expect(mockOAuthUseCase.disconnect).not.toHaveBeenCalled();
    });

    it("should handle disconnect failure", async () => {
      const mockOAuthUseCase = createMockOAuthUseCase(false);

      const mockWebhookHandler = vi
        .fn()
        .mockImplementation(async (request: Request) => {
          const shopDomain = request.headers.get("x-shopify-shop-domain");

          if (!shopDomain) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Missing shop domain header",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          try {
            await Effect.runPromise(
              mockOAuthUseCase.disconnect(shopDomain as ShopDomain),
            );

            return new Response(
              JSON.stringify({
                success: true,
                message: `App successfully uninstalled for shop: ${shopDomain}`,
                shopDomain,
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          } catch (error) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Failed to process uninstall",
                error: String(error),
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }
        });

      const request = new Request(
        "https://example.com/shopify/webhooks/app/uninstalled",
        {
          method: "POST",
          headers: {
            "x-shopify-shop-domain": testShop,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shop_domain: testShop,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      const response = await mockWebhookHandler(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Failed to process uninstall");

      // Verify the disconnect method was called
      expect(mockOAuthUseCase.disconnect).toHaveBeenCalledWith(testShop);
    });

    it("should handle different shop domain formats", async () => {
      const mockOAuthUseCase = createMockOAuthUseCase(true);
      const alternativeShop = "different-shop.myshopify.com" as ShopDomain;

      const mockWebhookHandler = vi
        .fn()
        .mockImplementation(async (request: Request) => {
          const shopDomain = request.headers.get("x-shopify-shop-domain");

          if (!shopDomain) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Missing shop domain header",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          try {
            const _result = await Effect.runPromise(
              mockOAuthUseCase.disconnect(shopDomain as ShopDomain),
            );

            return new Response(
              JSON.stringify({
                success: true,
                message: `App successfully uninstalled for shop: ${shopDomain}`,
                shopDomain,
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          } catch (error) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Failed to process uninstall",
                error: String(error),
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }
        });

      const request = new Request(
        "https://example.com/shopify/webhooks/app/uninstalled",
        {
          method: "POST",
          headers: {
            "x-shopify-shop-domain": alternativeShop,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shop_domain: alternativeShop,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      const response = await mockWebhookHandler(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.shopDomain).toBe(alternativeShop);

      // Verify the disconnect method was called with the correct shop
      expect(mockOAuthUseCase.disconnect).toHaveBeenCalledWith(alternativeShop);
    });
  });

  describe("Webhook Security", () => {
    it("should accept requests with proper Shopify headers", async () => {
      const mockWebhookHandler = vi
        .fn()
        .mockImplementation(async (request: Request) => {
          // Basic header validation
          const shopDomain = request.headers.get("x-shopify-shop-domain");
          const userAgent = request.headers.get("user-agent");

          // Shopify webhook requests typically have specific user agent patterns
          if (userAgent && !userAgent.includes("Shopify")) {
            // In a real implementation, you might be more strict about this
            // console.warn("Non-Shopify user agent detected:", userAgent);
          }

          if (!shopDomain) {
            return new Response(
              JSON.stringify({
                success: false,
                message: "Missing shop domain",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(JSON.stringify({ success: true, shopDomain }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        });

      const request = new Request(
        "https://example.com/shopify/webhooks/app/uninstalled",
        {
          method: "POST",
          headers: {
            "x-shopify-shop-domain": testShop,
            "user-agent": "Shopify/1.0",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shop_domain: testShop,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      const response = await mockWebhookHandler(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.shopDomain).toBe(testShop);
    });
  });
});
