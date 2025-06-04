import { describe, it, expect } from "@effect/vitest";
import { Effect, Layer } from "effect";
import {
  SMSService,
  MessageProviderService,
} from "../../../src/domain/global/messaging/service";
import { SMSServiceLive } from "../../../src/application/global/messaging/sms/service";
import {
  MessageSendError,
  MessageValidationError,
  MessageNotFoundError,
  type MessageContent,
  type PhoneNumber,
  type MessageId,
} from "../../../src/domain/global/messaging/models";

// Test helpers for creating valid test data
const createTestPhoneNumber = (number: string): PhoneNumber =>
  number as PhoneNumber;
const createTestMessageId = (id: string): MessageId => id as MessageId;
const createTestMessageContent = (content: string): MessageContent =>
  content as MessageContent;

// Mock provider service that succeeds
const MockProviderServiceTest = Layer.succeed(MessageProviderService, {
  sendMessage: (request) =>
    Effect.succeed({
      messageId: createTestMessageId("msg_12345"),
      status: "pending" as const,
      estimatedCost: 0.0075,
      providerId: "twilio",
    }),

  getMessageStatus: (messageId) =>
    Effect.succeed({
      id: messageId,
      to: createTestPhoneNumber("+1234567890"),
      from: createTestPhoneNumber("+1987654321"),
      content: createTestMessageContent("Test message"),
      type: "sms" as const,
      status: "delivered" as const,
      createdAt: new Date("2024-01-01T10:00:00Z"),
      updatedAt: new Date("2024-01-01T10:05:00Z"),
      metadata: { providerId: "twilio" },
    }),

  validatePhoneNumber: (phoneNumber) =>
    phoneNumber.match(/^\+[1-9]\d{1,14}$/)
      ? Effect.succeed(true)
      : Effect.fail(
          new MessageValidationError({
            message: "Invalid phone number format",
            field: "phoneNumber",
          })
        ),

  getProviderHealth: () => Effect.succeed(true),
});

// Mock provider with validation failures
const ValidationFailureProviderTest = Layer.succeed(MessageProviderService, {
  sendMessage: (request) =>
    Effect.succeed({
      messageId: createTestMessageId("msg_12345"),
      status: "pending" as const,
      estimatedCost: 0.0075,
      providerId: "twilio",
    }),

  getMessageStatus: (messageId) =>
    Effect.succeed({
      id: messageId,
      to: createTestPhoneNumber("+1234567890"),
      from: createTestPhoneNumber("+1987654321"),
      content: createTestMessageContent("Test message"),
      type: "sms" as const,
      status: "delivered" as const,
      createdAt: new Date("2024-01-01T10:00:00Z"),
      updatedAt: new Date("2024-01-01T10:05:00Z"),
      metadata: { providerId: "twilio" },
    }),

  validatePhoneNumber: () =>
    Effect.fail(
      new MessageValidationError({
        message: "Phone number validation failed",
        field: "phoneNumber",
      })
    ),

  getProviderHealth: () => Effect.succeed(true),
});

// Mock provider with send failures
const SendFailureProviderTest = Layer.succeed(MessageProviderService, {
  sendMessage: () =>
    Effect.fail(
      new MessageSendError({
        message: "Service temporarily unavailable",
        providerId: "twilio",
      })
    ),

  getMessageStatus: (messageId) =>
    Effect.succeed({
      id: messageId,
      to: createTestPhoneNumber("+1234567890"),
      from: createTestPhoneNumber("+1987654321"),
      content: createTestMessageContent("Test message"),
      type: "sms" as const,
      status: "failed" as const,
      createdAt: new Date("2024-01-01T10:00:00Z"),
      updatedAt: new Date("2024-01-01T10:05:00Z"),
      metadata: { providerId: "twilio" },
    }),

  validatePhoneNumber: (phoneNumber) =>
    phoneNumber.match(/^\+[1-9]\d{1,14}$/)
      ? Effect.succeed(true)
      : Effect.fail(
          new MessageValidationError({
            message: "Invalid phone number format",
            field: "phoneNumber",
          })
        ),

  getProviderHealth: () => Effect.succeed(false),
});

// Mock provider that returns WhatsApp messages (for testing wrong message type)
const WhatsAppProviderTest = Layer.succeed(MessageProviderService, {
  sendMessage: (request) =>
    Effect.succeed({
      messageId: createTestMessageId("msg_whatsapp_123"),
      status: "pending" as const,
      estimatedCost: 0.0,
      providerId: "whatsapp-business",
    }),

  getMessageStatus: (messageId) =>
    Effect.succeed({
      id: messageId,
      to: createTestPhoneNumber("+1234567890"),
      from: createTestPhoneNumber("+1987654321"),
      content: createTestMessageContent("WhatsApp message"),
      type: "whatsapp" as const, // Wrong type for SMS service
      status: "delivered" as const,
      createdAt: new Date("2024-01-01T10:00:00Z"),
      updatedAt: new Date("2024-01-01T10:05:00Z"),
      metadata: { providerId: "whatsapp-business" },
    }),

  validatePhoneNumber: (phoneNumber) =>
    phoneNumber.match(/^\+[1-9]\d{1,14}$/)
      ? Effect.succeed(true)
      : Effect.fail(
          new MessageValidationError({
            message: "Invalid phone number format",
            field: "phoneNumber",
          })
        ),

  getProviderHealth: () => Effect.succeed(true),
});

// Complete test layers using Layer.provide (the approach that works correctly)
const TestLayer = Layer.provide(SMSServiceLive, MockProviderServiceTest);
const ValidationFailureLayer = Layer.provide(
  SMSServiceLive,
  ValidationFailureProviderTest
);
const SendFailureLayer = Layer.provide(SMSServiceLive, SendFailureProviderTest);
const WhatsAppLayer = Layer.provide(SMSServiceLive, WhatsAppProviderTest);

describe("SMS Service", () => {
  describe("sendSMS", () => {
    it("should send SMS successfully with valid inputs", async () => {
      const program = Effect.gen(function* () {
        const smsService = yield* SMSService;

        const result = yield* smsService.sendSMS(
          createTestPhoneNumber("+1234567890"),
          createTestPhoneNumber("+1987654321"),
          "Hello, World!",
          { campaignId: "test_campaign", source: "unit_test" }
        );

        expect(result.messageId).toBe("msg_12345");
        expect(result.status).toBe("pending");
        expect(result.providerId).toBe("twilio");
        expect(result.estimatedCost).toBe(0.0075);

        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestLayer))
      );

      expect(result).toBeDefined();
    });

    it("should fail with invalid phone number validation", async () => {
      const program = Effect.gen(function* () {
        const smsService = yield* SMSService;

        yield* smsService.sendSMS(
          createTestPhoneNumber("+1234567890"), // This will fail validation in mock
          createTestPhoneNumber("+1987654321"),
          "Hello, World!"
        );
      });

      const result = await Effect.runPromise(
        Effect.either(program.pipe(Effect.provide(ValidationFailureLayer)))
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(MessageValidationError);
      }
    });

    it("should fail with empty message content", async () => {
      const program = Effect.gen(function* () {
        const smsService = yield* SMSService;

        // This should fail during message content validation
        yield* smsService.sendSMS(
          createTestPhoneNumber("+1234567890"),
          createTestPhoneNumber("+1987654321"),
          "" // Empty content should fail validation
        );
      });

      const result = await Effect.runPromise(
        Effect.either(program.pipe(Effect.provide(TestLayer)))
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(MessageValidationError);
      }
    });

    it("should fail when provider is unavailable", async () => {
      const program = Effect.gen(function* () {
        const smsService = yield* SMSService;

        yield* smsService.sendSMS(
          createTestPhoneNumber("+1234567890"),
          createTestPhoneNumber("+1987654321"),
          "Hello, World!"
        );
      });

      const result = await Effect.runPromise(
        Effect.either(program.pipe(Effect.provide(SendFailureLayer)))
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(MessageSendError);
      }
    });
  });

  describe("sendBulkSMS", () => {
    it("should send bulk SMS to multiple recipients", async () => {
      const program = Effect.gen(function* () {
        const smsService = yield* SMSService;

        const recipients = [
          createTestPhoneNumber("+1234567890"),
          createTestPhoneNumber("+1234567891"),
          createTestPhoneNumber("+1234567892"),
        ];

        const results = yield* smsService.sendBulkSMS(
          recipients,
          createTestPhoneNumber("+1987654321"),
          "Bulk notification message",
          { bulkCampaignId: "bulk_test_001" }
        );

        expect(results).toHaveLength(3);
        results.forEach((result) => {
          expect(result.messageId).toBe("msg_12345");
          expect(result.status).toBe("pending");
          expect(result.providerId).toBe("twilio");
          expect(result.estimatedCost).toBe(0.0075);
        });

        return results;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestLayer))
      );

      expect(result).toBeDefined();
    });

    it("should fail bulk SMS when provider is unavailable", async () => {
      const program = Effect.gen(function* () {
        const smsService = yield* SMSService;

        const recipients = [
          createTestPhoneNumber("+1234567890"),
          createTestPhoneNumber("+1234567891"),
        ];

        yield* smsService.sendBulkSMS(
          recipients,
          createTestPhoneNumber("+1987654321"),
          "Bulk message"
        );
      });

      const result = await Effect.runPromise(
        Effect.either(program.pipe(Effect.provide(SendFailureLayer)))
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(MessageSendError);
      }
    });
  });

  describe("getDeliveryReport", () => {
    it("should return delivery report for SMS message", async () => {
      const program = Effect.gen(function* () {
        const smsService = yield* SMSService;

        const report = yield* smsService.getDeliveryReport(
          createTestMessageId("msg_12345")
        );

        expect(report.id).toBe("msg_12345");
        expect(report.type).toBe("sms");
        expect(report.status).toBe("delivered");
        expect(report.to).toBe("+1234567890");
        expect(report.from).toBe("+1987654321");
        expect(report.content).toBe("Test message");
        expect(report.metadata?.providerId).toBe("twilio");

        return report;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TestLayer))
      );

      expect(result).toBeDefined();
    });

    it("should fail for non-SMS message type", async () => {
      const program = Effect.gen(function* () {
        const smsService = yield* SMSService;

        yield* smsService.getDeliveryReport(
          createTestMessageId("msg_whatsapp_123")
        );
      });

      const result = await Effect.runPromise(
        Effect.either(program.pipe(Effect.provide(WhatsAppLayer)))
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(MessageNotFoundError);
      }
    });
  });
});
