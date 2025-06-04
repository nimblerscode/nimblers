import { describe, expect, it, vi } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { SMSServiceLive } from "../../src/application/global/messaging/sms/service";
import type { PhoneNumber } from "../../src/domain/global/messaging/models";
import { SMSService } from "../../src/domain/global/messaging/service";
import {
  TwilioApiClientLive,
  TwilioConfig,
  TwilioMessageProviderLive,
} from "../../src/infrastructure/messaging/twilio";

// Mock fetch for testing the fetch-based Twilio implementation
const createMockFetch = () => {
  return vi
    .fn()
    .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      // Properly extract URL and method from both string and Request object inputs
      let url: string;
      let method: string;

      if (typeof input === "string") {
        url = input;
        method = init?.method || "GET";
      } else if (input instanceof Request) {
        url = input.url;
        method = input.method;
      } else {
        // URL object
        url = input.toString();
        method = init?.method || "GET";
      }

      // Mock Twilio Messages API
      if (url.includes("/Messages.json") && method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              sid: "SM123456789",
              status: "queued",
              date_created: "2024-01-01T10:00:00Z",
              price: "0.0075",
            }),
            { status: 200 }
          )
        );
      }

      // Mock Twilio Get Message API
      if (url.includes("/Messages/") && method === "GET") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              sid: "SM123456789",
              status: "delivered",
              body: "Test message",
              to: "+1234567890",
              from: "+1987654321",
              date_created: "2024-01-01T10:00:00Z",
              date_updated: "2024-01-01T10:05:00Z",
            }),
            { status: 200 }
          )
        );
      }

      // Mock Twilio Lookup API
      if (url.includes("lookups.twilio.com")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              phone_number: "+1234567890",
              country_code: "US",
            }),
            { status: 200 }
          )
        );
      }

      // Mock Twilio Account API for health check
      if (url.includes("/Accounts/") && url.endsWith(".json")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              sid: "test-account-sid",
              status: "active",
            }),
            { status: 200 }
          )
        );
      }

      // Default mock response
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });
};

// Test Twilio Config Layer
const TwilioConfigTest = Layer.succeed(TwilioConfig, {
  accountSid: "test-account-sid",
  authToken: "test-auth-token",
  fromNumber: "+1987654321" as PhoneNumber,
  webhookUrl: "https://webhook.example.com",
});

// Create MessagingLayerTest that mirrors MessagingLayerLive structure
function MessagingLayerTest() {
  // Use the Live TwilioApiClient implementation with test config
  const TwilioClientLayer = Layer.provide(
    TwilioApiClientLive,
    TwilioConfigTest
  );

  // Use the Live TwilioMessageProvider implementation with test dependencies
  const MessageProviderLayer = Layer.provide(
    TwilioMessageProviderLive,
    Layer.merge(TwilioClientLayer, TwilioConfigTest)
  );

  // Use the Live SMS service implementation with test provider
  const SMSLayer = Layer.provide(SMSServiceLive, MessageProviderLayer);

  return SMSLayer;
}

describe("Messaging System Integration", () => {
  it("should demonstrate the complete messaging system architecture", async () => {
    // Set up mock fetch
    globalThis.fetch = createMockFetch();
    const testLayer = MessagingLayerTest();

    // Test SMS sending workflow
    const program = Effect.gen(function* () {
      const smsService = yield* SMSService;

      // Send an SMS message
      const result = yield* smsService.sendSMS(
        "+1234567890" as PhoneNumber,
        "+1987654321" as PhoneNumber,
        "Hello from integration test!",
        { campaignId: "integration-test" }
      );

      // Verify the response structure
      expect(result.messageId).toBeDefined();
      expect(result.status).toBeDefined();
      expect(typeof result.messageId).toBe("string");
      expect(
        ["pending", "sent", "delivered", "failed"].includes(result.status)
      ).toBe(true);

      return result;
    });

    // Run the program with dependency injection
    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    expect(result).toBeDefined();
    expect(result.messageId).toBeDefined();
  });

  it("should handle SMS validation errors gracefully", async () => {
    globalThis.fetch = createMockFetch();
    const testLayer = MessagingLayerTest();

    const program = Effect.gen(function* () {
      const smsService = yield* SMSService;

      // Try to send with invalid phone number
      yield* smsService.sendSMS(
        "invalid-phone" as PhoneNumber,
        "+1987654321" as PhoneNumber,
        "Test message"
      );
    });

    // This should fail gracefully
    const result = Effect.runPromise(
      program.pipe(Effect.provide(testLayer), Effect.flip)
    );

    const error = await result;
    expect(error).toBeDefined();
  });

  it("should support bulk SMS operations", async () => {
    globalThis.fetch = createMockFetch();
    const testLayer = MessagingLayerTest();

    const recipients = [
      "+1234567890" as PhoneNumber,
      "+1234567891" as PhoneNumber,
      "+1234567892" as PhoneNumber,
    ];

    const program = Effect.gen(function* () {
      const smsService = yield* SMSService;

      const results = yield* smsService.sendBulkSMS(
        recipients,
        "+1987654321" as PhoneNumber,
        "Bulk test message"
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.messageId).toBeDefined();
        expect(result.status).toBeDefined();
      });

      return results;
    });

    const results = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    expect(results).toHaveLength(3);
  });

  it("should provide delivery reports", async () => {
    globalThis.fetch = createMockFetch();
    const testLayer = MessagingLayerTest();

    const program = Effect.gen(function* () {
      const smsService = yield* SMSService;

      // First send a message
      const sendResult = yield* smsService.sendSMS(
        "+1234567890" as PhoneNumber,
        "+1987654321" as PhoneNumber,
        "Test for delivery report"
      );

      // Then get delivery status
      const deliveryReport = yield* smsService.getDeliveryReport(
        sendResult.messageId
      );

      expect(deliveryReport).toBeDefined();
      expect(deliveryReport.id).toBe(sendResult.messageId);
      expect(deliveryReport.status).toBeDefined();

      return deliveryReport;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    expect(result).toBeDefined();
  });

  it("should handle message sending workflow", async () => {
    globalThis.fetch = createMockFetch();
    const testLayer = MessagingLayerTest();

    const program = Effect.gen(function* () {
      const smsService = yield* SMSService;

      // Test the complete workflow
      const result = yield* smsService.sendSMS(
        "+1234567890" as PhoneNumber,
        "+1987654321" as PhoneNumber,
        "Workflow test message"
      );

      expect(result.messageId).toBeDefined();
      expect(result.status).toBeDefined();

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    expect(result.messageId).toBeDefined();
  });

  it("should handle provider errors gracefully", async () => {
    // Create a failing mock fetch
    const failingFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = failingFetch;

    const TwilioClientLayer = Layer.provide(
      TwilioApiClientLive,
      TwilioConfigTest
    );

    const MessageProviderLayer = Layer.provide(
      TwilioMessageProviderLive,
      Layer.merge(TwilioClientLayer, TwilioConfigTest)
    );

    const SMSLayer = Layer.provide(SMSServiceLive, MessageProviderLayer);

    const program = Effect.gen(function* () {
      const smsService = yield* SMSService;

      yield* smsService.sendSMS(
        "+1234567890" as PhoneNumber,
        "+1987654321" as PhoneNumber,
        "Test message"
      );
    });

    // This should fail gracefully
    const result = Effect.runPromise(
      program.pipe(Effect.provide(SMSLayer), Effect.flip)
    );

    const error = await result;
    expect(error).toBeDefined();

    // Restore original fetch
    globalThis.fetch = originalFetch;
  });

  it("should demonstrate proper dependency injection", async () => {
    globalThis.fetch = createMockFetch();
    const testLayer = MessagingLayerTest();

    // This test verifies that all layers are properly composed
    const program = Effect.gen(function* () {
      const smsService = yield* SMSService;

      // The fact that we can access the service means DI is working
      expect(smsService).toBeDefined();
      expect(typeof smsService.sendSMS).toBe("function");
      expect(typeof smsService.getDeliveryReport).toBe("function");
      expect(typeof smsService.sendBulkSMS).toBe("function");

      return true;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    expect(result).toBe(true);
  });

  it("should handle different message statuses", async () => {
    // Create a mock that returns different statuses
    const statusMockFetch = vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        // Properly extract URL and method from both string and Request object inputs
        let url: string;
        let method: string;

        if (typeof input === "string") {
          url = input;
          method = init?.method || "GET";
        } else if (input instanceof Request) {
          url = input.url;
          method = input.method;
        } else {
          // URL object
          url = input.toString();
          method = init?.method || "GET";
        }

        if (url.includes("/Messages.json") && method === "POST") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                sid: "SM123456789",
                status: "sent", // Different status
                date_created: "2024-01-01T10:00:00Z",
                price: "0.0075",
              }),
              { status: 200 }
            )
          );
        }

        // Mock Twilio Lookup API for this test as well
        if (url.includes("lookups.twilio.com")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                phone_number: "+1234567890",
                country_code: "US",
              }),
              { status: 200 }
            )
          );
        }

        return Promise.resolve(new Response("Not Found", { status: 404 }));
      });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = statusMockFetch;

    const TwilioClientLayer = Layer.provide(
      TwilioApiClientLive,
      TwilioConfigTest
    );

    const MessageProviderLayer = Layer.provide(
      TwilioMessageProviderLive,
      Layer.merge(TwilioClientLayer, TwilioConfigTest)
    );

    const SMSLayer = Layer.provide(SMSServiceLive, MessageProviderLayer);

    const program = Effect.gen(function* () {
      const smsService = yield* SMSService;

      const result = yield* smsService.sendSMS(
        "+1234567890" as PhoneNumber,
        "+1987654321" as PhoneNumber,
        "Status test message"
      );

      expect(result.status).toBe("sent");
      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(SMSLayer))
    );

    expect(result.status).toBe("sent");

    // Restore original fetch
    globalThis.fetch = originalFetch;
  });
});
