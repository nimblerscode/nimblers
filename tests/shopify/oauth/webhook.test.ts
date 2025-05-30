import { describe, expect, it, vi } from "@effect/vitest";
import { Effect } from "effect";
import {
  type AccessToken,
  OAuthError,
  type ShopDomain,
} from "../../../src/domain/shopify/oauth/models";
import { WebhookService } from "../../../src/domain/shopify/oauth/service";
import { WebhookServiceLive } from "../../../src/infrastructure/shopify/webhooks/WebhookService";

// Mock fetch function
const createMockFetch = (mockResponse: Partial<Response> & { ok: boolean }) => {
  const { ok, ...otherProps } = mockResponse;
  return vi.fn().mockResolvedValue({
    ok,
    status: mockResponse.status || (ok ? 200 : 400),
    text: mockResponse.text || vi.fn().mockResolvedValue(""),
    json: mockResponse.json || vi.fn().mockResolvedValue({}),
    ...otherProps,
  });
};

describe("WebhookService", () => {
  const testShop = "test-shop.myshopify.com" as ShopDomain;
  const testAccessToken = "shpat_test_token" as AccessToken;
  const testWebhookUrl = "https://example.com/webhooks/app/uninstalled";

  const MockWebhookServiceLayer = WebhookServiceLive;

  describe("registerAppUninstallWebhook", () => {
    it.scoped(
      "should successfully register webhook with valid parameters",
      () =>
        Effect.gen(function* () {
          // Mock successful fetch response
          const mockFetch = createMockFetch({
            ok: true,
            status: 201,
            json: vi.fn().mockResolvedValue({
              webhook: {
                id: 12345,
                topic: "app/uninstalled",
                address: testWebhookUrl,
                format: "json",
              },
            }),
          });
          global.fetch = mockFetch;

          const webhookService = yield* WebhookService;

          const result = yield* webhookService.registerAppUninstallWebhook(
            testShop,
            testAccessToken,
            testWebhookUrl
          );

          // Should not throw and complete successfully
          expect(result).toBeUndefined(); // void return

          // Verify fetch was called with correct parameters
          expect(mockFetch).toHaveBeenCalledWith(
            `https://${testShop}/admin/api/2024-04/webhooks.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": testAccessToken,
              },
              body: JSON.stringify({
                webhook: {
                  topic: "app/uninstalled",
                  address: testWebhookUrl,
                  format: "json",
                },
              }),
            }
          );
        }).pipe(Effect.provide(MockWebhookServiceLayer))
    );

    it.scoped("should handle Shopify API error response", () =>
      Effect.gen(function* () {
        // Mock error response
        const mockFetch = createMockFetch({
          ok: false,
          status: 422,
          text: vi.fn().mockResolvedValue(
            JSON.stringify({
              errors: {
                address: ["has already been taken for this topic"],
              },
            })
          ),
        });
        global.fetch = mockFetch;

        const webhookService = yield* WebhookService;

        const result = yield* Effect.either(
          webhookService.registerAppUninstallWebhook(
            testShop,
            testAccessToken,
            testWebhookUrl
          )
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(OAuthError);
          expect(result.left.message).toContain("Webhook registration failed");
          expect(result.left.message).toContain("422");
        }
      }).pipe(Effect.provide(MockWebhookServiceLayer))
    );

    it.scoped("should handle network errors", () =>
      Effect.gen(function* () {
        // Mock network error
        const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
        global.fetch = mockFetch;

        const webhookService = yield* WebhookService;

        const result = yield* Effect.either(
          webhookService.registerAppUninstallWebhook(
            testShop,
            testAccessToken,
            testWebhookUrl
          )
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(OAuthError);
          expect(result.left.message).toContain(
            "Failed to register app uninstall webhook"
          );
        }
      }).pipe(Effect.provide(MockWebhookServiceLayer))
    );

    it.scoped("should handle invalid access token", () =>
      Effect.gen(function* () {
        // Mock unauthorized response
        const mockFetch = createMockFetch({
          ok: false,
          status: 401,
          text: vi.fn().mockResolvedValue("Unauthorized"),
        });
        global.fetch = mockFetch;

        const webhookService = yield* WebhookService;

        const result = yield* Effect.either(
          webhookService.registerAppUninstallWebhook(
            testShop,
            testAccessToken,
            testWebhookUrl
          )
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(OAuthError);
          expect(result.left.message).toContain("401");
        }
      }).pipe(Effect.provide(MockWebhookServiceLayer))
    );

    it.scoped("should handle error response text reading failure", () =>
      Effect.gen(function* () {
        // Mock response that fails to read text
        const mockFetch = createMockFetch({
          ok: false,
          status: 500,
          text: vi.fn().mockRejectedValue(new Error("Failed to read text")),
        });
        global.fetch = mockFetch;

        const webhookService = yield* WebhookService;

        const result = yield* Effect.either(
          webhookService.registerAppUninstallWebhook(
            testShop,
            testAccessToken,
            testWebhookUrl
          )
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(OAuthError);
          expect(result.left.message).toContain("Unknown error");
        }
      }).pipe(Effect.provide(MockWebhookServiceLayer))
    );

    it.scoped("should use correct API version and endpoint format", () =>
      Effect.gen(function* () {
        const mockFetch = createMockFetch({ ok: true });
        global.fetch = mockFetch;

        const webhookService = yield* WebhookService;

        yield* webhookService.registerAppUninstallWebhook(
          testShop,
          testAccessToken,
          testWebhookUrl
        );

        const [url, options] = mockFetch.mock.calls[0];

        // Verify correct API endpoint format
        expect(url).toBe(`https://${testShop}/admin/api/2024-04/webhooks.json`);

        // Verify request structure
        expect(options.method).toBe("POST");
        expect(options.headers["Content-Type"]).toBe("application/json");
        expect(options.headers["X-Shopify-Access-Token"]).toBe(testAccessToken);

        const body = JSON.parse(options.body);
        expect(body.webhook.topic).toBe("app/uninstalled");
        expect(body.webhook.address).toBe(testWebhookUrl);
        expect(body.webhook.format).toBe("json");
      }).pipe(Effect.provide(MockWebhookServiceLayer))
    );
  });
});
