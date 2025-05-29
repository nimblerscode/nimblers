import { describe, expect, it } from "@effect/vitest";
import { handleShopifyComplianceWebhook } from "../../../src/app/actions/shopify/compliance";

describe("handleShopifyComplianceWebhook", () => {
  const testSecret = "test-webhook-secret";

  // Helper to create HMAC signature
  const createHmacSignature = async (
    payload: string,
    secret: string,
  ): Promise<string> => {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload),
    );
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  };

  const createMockRequest = async (
    payload: object,
    secret: string = testSecret,
  ): Promise<Request> => {
    const body = JSON.stringify(payload);
    const hmac = await createHmacSignature(body, secret);

    return new Request("https://example.com/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Hmac-Sha256": hmac,
      },
      body,
    });
  };

  const validCustomerDataRequestPayload = {
    shop_id: 12345,
    shop_domain: "test-shop.myshopify.com",
    orders_requested: [1001, 1002],
    customer: {
      id: 67890,
      email: "customer@example.com",
      phone: "+1234567890",
    },
  };

  const validCustomerRedactPayload = {
    shop_id: 12345,
    shop_domain: "test-shop.myshopify.com",
    customer: {
      id: 67890,
      email: "customer@example.com",
    },
    orders_to_redact: [1001, 1002],
  };

  const validShopRedactPayload = {
    shop_id: 12345,
    shop_domain: "test-shop.myshopify.com",
  };

  describe("Customer Data Request", () => {
    it("should handle valid customer data request webhook", async () => {
      const request = await createMockRequest(validCustomerDataRequestPayload);

      const response = await handleShopifyComplianceWebhook(
        "customers-data-request",
        request,
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
      expect(response.headers.get("Content-Type")).toBe("text/plain");
    });

    it("should reject request with invalid HMAC", async () => {
      const request = await createMockRequest(
        validCustomerDataRequestPayload,
        "wrong-secret",
      );

      const response = await handleShopifyComplianceWebhook(
        "customers-data-request",
        request,
      );

      expect(response.status).toBe(401);
      expect(await response.text()).toBe(
        "Unauthorized: Invalid HMAC signature",
      );
    });

    it("should reject request with missing HMAC header", async () => {
      const request = new Request("https://example.com/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validCustomerDataRequestPayload),
      });

      const response = await handleShopifyComplianceWebhook(
        "customers-data-request",
        request,
      );

      expect(response.status).toBe(401);
      expect(await response.text()).toBe(
        "Unauthorized: Invalid HMAC signature",
      );
    });

    it("should reject request with invalid payload", async () => {
      const invalidPayload = { invalid: "payload" };
      const request = await createMockRequest(invalidPayload);

      const response = await handleShopifyComplianceWebhook(
        "customers-data-request",
        request,
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Bad Request: Invalid webhook data");
    });
  });

  describe("Customer Data Erasure", () => {
    it("should handle valid customer data erasure webhook", async () => {
      const request = await createMockRequest(validCustomerRedactPayload);

      const response = await handleShopifyComplianceWebhook(
        "customers-data-erasure",
        request,
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });

    it("should reject request with invalid payload", async () => {
      const invalidPayload = { shop_id: "invalid" };
      const request = await createMockRequest(invalidPayload);

      const response = await handleShopifyComplianceWebhook(
        "customers-data-erasure",
        request,
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Bad Request: Invalid webhook data");
    });
  });

  describe("Shop Data Erasure", () => {
    it("should handle valid shop data erasure webhook", async () => {
      const request = await createMockRequest(validShopRedactPayload);

      const response = await handleShopifyComplianceWebhook(
        "shop-data-erasure",
        request,
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });

    it("should reject request with invalid payload", async () => {
      const invalidPayload = { invalid: "payload" };
      const request = await createMockRequest(invalidPayload);

      const response = await handleShopifyComplianceWebhook(
        "shop-data-erasure",
        request,
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Bad Request: Invalid webhook data");
    });
  });

  describe("Malformed Requests", () => {
    it("should handle malformed JSON gracefully", async () => {
      const malformedBody = "invalid json {";
      const hmac = await createHmacSignature(malformedBody, testSecret);

      const request = new Request("https://example.com/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Hmac-Sha256": hmac,
        },
        body: malformedBody,
      });

      const response = await handleShopifyComplianceWebhook(
        "customers-data-request",
        request,
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Bad Request: Invalid webhook data");
    });
  });
});
