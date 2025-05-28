import { describe, expect, it } from "@effect/vitest";
import { handleShopifyComplianceWebhook } from "../../../src/app/actions/shopify/compliance";

describe("Shopify Compliance Webhooks Integration", () => {
  const testSecret = "test-webhook-secret";

  // Helper to create HMAC signature
  const createHmacSignature = async (
    payload: string,
    secret: string
  ): Promise<string> => {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  };

  const createMockRequest = async (
    payload: object,
    secret: string = testSecret
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

  describe("End-to-End Webhook Processing", () => {
    it("should process customer data request webhook end-to-end", async () => {
      const payload = {
        shop_id: 12345,
        shop_domain: "test-shop.myshopify.com",
        orders_requested: [1001, 1002],
        customer: {
          id: 67890,
          email: "customer@example.com",
          phone: "+1234567890",
        },
      };

      const request = await createMockRequest(payload);
      const response = await handleShopifyComplianceWebhook(
        "customers-data-request",
        request
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
      expect(response.headers.get("Content-Type")).toBe("text/plain");
    });

    it("should process customer data erasure webhook end-to-end", async () => {
      const payload = {
        shop_id: 12345,
        shop_domain: "test-shop.myshopify.com",
        customer: {
          id: 67890,
          email: "customer@example.com",
        },
        orders_to_redact: [1001, 1002],
      };

      const request = await createMockRequest(payload);
      const response = await handleShopifyComplianceWebhook(
        "customers-data-erasure",
        request
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });

    it("should process shop data erasure webhook end-to-end", async () => {
      const payload = {
        shop_id: 12345,
        shop_domain: "test-shop.myshopify.com",
      };

      const request = await createMockRequest(payload);
      const response = await handleShopifyComplianceWebhook(
        "shop-data-erasure",
        request
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });
  });

  describe("Security Validation", () => {
    it("should reject requests with invalid HMAC signatures", async () => {
      const payload = {
        shop_id: 12345,
        shop_domain: "test-shop.myshopify.com",
        customer: { id: 67890, email: "customer@example.com" },
      };

      // Create request with wrong secret
      const request = await createMockRequest(payload, "wrong-secret");
      const response = await handleShopifyComplianceWebhook(
        "customers-data-request",
        request
      );

      expect(response.status).toBe(401);
      expect(await response.text()).toBe(
        "Unauthorized: Invalid HMAC signature"
      );
    });

    it("should reject requests without HMAC headers", async () => {
      const payload = {
        shop_id: 12345,
        shop_domain: "test-shop.myshopify.com",
        customer: { id: 67890, email: "customer@example.com" },
      };

      const request = new Request("https://example.com/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await handleShopifyComplianceWebhook(
        "customers-data-request",
        request
      );

      expect(response.status).toBe(401);
      expect(await response.text()).toBe(
        "Unauthorized: Invalid HMAC signature"
      );
    });
  });

  describe("Data Validation", () => {
    it("should reject malformed JSON payloads", async () => {
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
        request
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Bad Request: Invalid webhook data");
    });

    it("should reject payloads with missing required fields", async () => {
      const invalidPayload = {
        shop_id: 12345,
        // Missing shop_domain and customer
      };

      const request = await createMockRequest(invalidPayload);
      const response = await handleShopifyComplianceWebhook(
        "customers-data-request",
        request
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Bad Request: Invalid webhook data");
    });

    it("should reject payloads with invalid data types", async () => {
      const invalidPayload = {
        shop_id: "not-a-number",
        shop_domain: "test-shop.myshopify.com",
        customer: {
          id: "not-a-number",
          email: "invalid-email-format",
        },
      };

      const request = await createMockRequest(invalidPayload);
      const response = await handleShopifyComplianceWebhook(
        "customers-data-request",
        request
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Bad Request: Invalid webhook data");
    });
  });

  describe("Error Handling", () => {
    it("should handle different webhook types correctly", async () => {
      const webhookTypes = [
        "customers-data-request",
        "customers-data-erasure",
        "shop-data-erasure",
      ] as const;

      for (const webhookType of webhookTypes) {
        let payload: any;

        if (webhookType === "customers-data-request") {
          payload = {
            shop_id: 12345,
            shop_domain: "test-shop.myshopify.com",
            customer: { id: 67890, email: "customer@example.com" },
            orders_requested: [1001, 1002],
          };
        } else if (webhookType === "customers-data-erasure") {
          payload = {
            shop_id: 12345,
            shop_domain: "test-shop.myshopify.com",
            customer: { id: 67890, email: "customer@example.com" },
            orders_to_redact: [1001, 1002],
          };
        } else {
          // shop-data-erasure
          payload = {
            shop_id: 12345,
            shop_domain: "test-shop.myshopify.com",
          };
        }

        const request = await createMockRequest(payload);
        const response = await handleShopifyComplianceWebhook(
          webhookType,
          request
        );

        expect(response.status).toBe(200);
        expect(await response.text()).toBe("OK");
      }
    });
  });

  describe("Performance and Edge Cases", () => {
    it("should handle large payloads efficiently", async () => {
      const largePayload = {
        shop_id: 12345,
        shop_domain: "test-shop.myshopify.com",
        orders_requested: Array.from({ length: 1000 }, (_, i) => i + 1),
        customer: {
          id: 67890,
          email: "customer@example.com",
          phone: "+1234567890",
        },
      };

      const startTime = Date.now();
      const request = await createMockRequest(largePayload);
      const response = await handleShopifyComplianceWebhook(
        "customers-data-request",
        request
      );
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should handle concurrent requests", async () => {
      const payload = {
        shop_id: 12345,
        shop_domain: "test-shop.myshopify.com",
        customer: { id: 67890, email: "customer@example.com" },
        orders_requested: [1001, 1002],
      };

      const requests = await Promise.all([
        createMockRequest(payload),
        createMockRequest(payload),
        createMockRequest(payload),
      ]);

      const responses = await Promise.all(
        requests.map((request) =>
          handleShopifyComplianceWebhook("customers-data-request", request)
        )
      );

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it("should handle special characters in data", async () => {
      const payload = {
        shop_id: 12345,
        shop_domain: "test-shop.myshopify.com",
        customer: {
          id: 67890,
          email: "customer+test@example.com",
          phone: "+1 (234) 567-8900 ext. 123",
        },
        orders_requested: [1001, 1002],
      };

      const request = await createMockRequest(payload);
      const response = await handleShopifyComplianceWebhook(
        "customers-data-request",
        request
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });
  });
});
