import { describe, expect, it, vi } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { SMSServiceLive } from "../../src/application/global/messaging/sms/service";
import type {
  MessageProviderConfig,
  PhoneNumber,
} from "../../src/domain/global/messaging/models";
import { SMSService } from "../../src/domain/global/messaging/service";
import {
  TwilioApiClientLive,
  TwilioConfig,
  TwilioMessageProviderLive,
  TwilioSDKService,
} from "../../src/infrastructure/messaging/twilio";

// Mock Twilio SDK for testing (this replaces the real Twilio SDK)
const createMockTwilioSDK = () => {
  const mockMessage = {
    fetch: vi.fn().mockResolvedValue({
      sid: "SM123456789",
      status: "delivered",
      body: "Test message",
      to: "+1234567890",
      from: "+1987654321",
      dateCreated: "2024-01-01T10:00:00Z", // String instead of Date
      dateUpdated: "2024-01-01T10:05:00Z", // String instead of Date
      errorCode: null,
    }),
  };

  return {
    messages: Object.assign(
      // Function that returns message object for getMessage calls
      vi.fn().mockImplementation((sid: string) => mockMessage),
      // Create method for sendMessage calls
      {
        create: vi.fn().mockResolvedValue({
          sid: "SM123456789",
          status: "queued",
          dateCreated: "2024-01-01T10:00:00Z", // String instead of Date
          price: "0.0075",
          errorCode: null,
          errorMessage: null,
        }),
      }
    ),
    lookups: {
      v1: {
        phoneNumbers: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue({
            phoneNumber: "+1234567890",
            countryCode: "US",
          }),
        }),
      },
    },
  } as any;
};

// Test Twilio SDK Service Layer (replaces real SDK with mock)
const TwilioSDKServiceTest = Layer.succeed(TwilioSDKService, {
  sdk: createMockTwilioSDK(),
});

// Test Twilio Config Layer
const TwilioConfigTest = Layer.succeed(TwilioConfig, {
  config: {
    accountSid: "test-account-sid",
    authToken: "test-auth-token",
    fromNumber: "+1987654321" as PhoneNumber,
    webhookUrl: "https://webhook.example.com",
  } as MessageProviderConfig,
});

// Create MessagingLayerTest that mirrors MessagingLayerLive structure
function MessagingLayerTest() {
  // Use the Live TwilioApiClient implementation with test SDK
  const TwilioClientLayer = Layer.provide(
    TwilioApiClientLive,
    TwilioSDKServiceTest
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
    const testLayer = MessagingLayerTest();

    const program = Effect.gen(function* () {
      const smsService = yield* SMSService;

      // First send a message
      const sendResult = yield* smsService.sendSMS(
        "+1234567890" as PhoneNumber,
        "+1987654321" as PhoneNumber,
        "Test for delivery report"
      );

      // Then get delivery report
      const deliveryReport = yield* smsService.getDeliveryReport(
        sendResult.messageId
      );

      expect(deliveryReport.id).toBe(sendResult.messageId);
      expect(deliveryReport.status).toBeDefined();
      expect(deliveryReport.to).toBe("+1234567890");
      expect(deliveryReport.from).toBe("+1987654321");

      return deliveryReport;
    });

    const report = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    expect(report).toBeDefined();
    expect(report.status).toBeDefined();
  });

  it("should demonstrate clean architecture with dependency injection", async () => {
    // This test shows how the system maintains clean architecture:
    // 1. Domain layer defines interfaces
    // 2. Application layer implements business logic
    // 3. Infrastructure layer provides concrete implementations (test versions)
    // 4. Configuration layer wires everything together

    const testLayer = MessagingLayerTest();

    const program = Effect.gen(function* () {
      // Business logic depends on abstract interfaces
      const smsService = yield* SMSService;

      // But gets concrete implementations through DI
      const result = yield* smsService.sendSMS(
        "+1234567890" as PhoneNumber,
        "+1987654321" as PhoneNumber,
        "Architecture test"
      );

      // The service orchestrates multiple concerns:
      // - Phone number validation (test implementation)
      // - Message sending via provider (test implementation)
      // - Business rule enforcement
      // - Error handling

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    // This demonstrates that:
    // 1. Dependencies are properly injected (test implementations used)
    // 2. Business logic is isolated and testable
    // 3. Infrastructure concerns are abstracted away
    // 4. The system is composable and extensible

    expect(result).toBeDefined();
    expect(result.messageId).toBeDefined();
  });

  it("should handle partial failures in bulk operations", async () => {
    // Create a custom test layer with a failing SDK for the second call
    let callCount = 0;
    const baseMockSdk = createMockTwilioSDK();
    const mockSdkWithFailure = {
      ...baseMockSdk,
      messages: Object.assign(baseMockSdk.messages, {
        create: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            return Promise.reject(new Error("Provider rate limit exceeded"));
          }
          return Promise.resolve({
            sid: `SMS${callCount}`,
            status: "queued",
            dateCreated: "2024-01-01T10:00:00Z", // String format
            price: "0.0075",
          });
        }),
      }),
    };

    // Create test layer with failing SDK
    const FailingSDKLayer = Layer.succeed(TwilioSDKService, {
      sdk: mockSdkWithFailure,
    });

    const FailingClientLayer = Layer.provide(
      TwilioApiClientLive,
      FailingSDKLayer
    );
    const FailingProviderLayer = Layer.provide(
      TwilioMessageProviderLive,
      Layer.merge(FailingClientLayer, TwilioConfigTest)
    );
    const FailingSMSLayer = Layer.provide(SMSServiceLive, FailingProviderLayer);

    const recipients = [
      "+1234567890" as PhoneNumber,
      "+1234567891" as PhoneNumber,
      "+1234567892" as PhoneNumber,
    ];

    const program = Effect.gen(function* () {
      const smsService = yield* SMSService;
      yield* smsService.sendBulkSMS(
        recipients,
        "+1987654321" as PhoneNumber,
        "Bulk message with failure"
      );
    });

    const result = Effect.runPromise(
      program.pipe(Effect.provide(FailingSMSLayer), Effect.flip)
    );

    const error = await result;
    expect(error).toBeDefined();
    expect(callCount).toBe(3); // Made all 3 calls despite failure on second
  });

  it("should validate the layer composition architecture", async () => {
    // This test validates that the layer composition works correctly
    // Each layer provides specific dependencies in the right order

    const testLayer = MessagingLayerTest();

    const program = Effect.gen(function* () {
      // Access services to verify composition
      const smsService = yield* SMSService;

      // Verify SMS service (application layer)
      const result = yield* smsService.sendSMS(
        "+1234567890" as PhoneNumber,
        "+1987654321" as PhoneNumber,
        "Layer composition test"
      );

      return result;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(testLayer))
    );

    expect(result.messageId).toBeDefined();
  });
});
