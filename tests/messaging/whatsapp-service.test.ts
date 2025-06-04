import { describe, it, expect, vi } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { WhatsAppService } from "../../src/domain/global/messaging/service";
import { WhatsAppServiceLive } from "../../src/application/global/messaging/whatsapp/service";
import { MessageProviderService } from "../../src/domain/global/messaging/service";
import {
  MessageSendError,
  MessageValidationError,
  MessageNotFoundError,
  type PhoneNumber,
  type MessageId,
  type MessageContent,
  type SendMessageRequest,
  type SendMessageResponse,
  type Message,
} from "../../src/domain/global/messaging/models";

// Mock MessageProviderService
const createMockProvider = (overrides: Partial<any> = {}) => ({
  sendMessage: vi.fn().mockImplementation((request: SendMessageRequest) =>
    Effect.succeed({
      messageId: "WA123456789" as MessageId,
      status: "pending" as const,
      estimatedCost: 0.005,
      providerId: "twilio",
      ...overrides.sendMessage,
    } as SendMessageResponse)
  ),

  getMessageStatus: vi.fn().mockImplementation((messageId: MessageId) =>
    Effect.succeed({
      id: messageId,
      to: "+1234567890" as PhoneNumber,
      from: "+1987654321" as PhoneNumber,
      content: "WhatsApp message" as MessageContent,
      type: "whatsapp" as const,
      status: "delivered" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { providerId: "twilio" },
      ...overrides.getMessageStatus,
    } as Message)
  ),

  validatePhoneNumber: vi.fn().mockImplementation((phoneNumber: PhoneNumber) =>
    /^\+[1-9]\d{1,14}$/.test(phoneNumber)
      ? Effect.succeed(true)
      : Effect.fail(
          new MessageValidationError({
            message: "Invalid phone number format",
            field: "phoneNumber",
          })
        )
  ),

  getProviderHealth: vi.fn().mockImplementation(() => Effect.succeed(true)),
  ...overrides,
});

// Helper to create test layer
const createTestLayer = (mockProvider: any = createMockProvider()) => {
  const MockProviderLayer = Layer.succeed(MessageProviderService, mockProvider);
  return Layer.provide(WhatsAppServiceLive, MockProviderLayer);
};

describe("WhatsAppService", () => {
  describe("sendWhatsAppMessage", () => {
    it("should send WhatsApp message successfully", async () => {
      const mockProvider = createMockProvider();
      const testLayer = createTestLayer(mockProvider);

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        const result = yield* service.sendWhatsAppMessage(
          "+1234567890" as PhoneNumber,
          "+1987654321" as PhoneNumber,
          "Hello via WhatsApp!",
          { campaignId: "whatsapp-test" }
        );

        expect(result.messageId).toBe("WA123456789");
        expect(result.status).toBe("pending");
        expect(result.providerId).toBe("twilio");

        // Verify provider was called with correct WhatsApp request
        expect(mockProvider.sendMessage).toHaveBeenCalledWith({
          to: "+1234567890",
          from: "+1987654321",
          content: "Hello via WhatsApp!",
          type: "whatsapp",
          metadata: { campaignId: "whatsapp-test" },
        });

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should validate phone numbers before sending", async () => {
      const mockProvider = createMockProvider({
        validatePhoneNumber: vi
          .fn()
          .mockImplementation((phoneNumber: PhoneNumber) =>
            phoneNumber === "invalid-phone"
              ? Effect.fail(
                  new MessageValidationError({
                    message: "Invalid phone number format",
                    field: "phoneNumber",
                  })
                )
              : Effect.succeed(true)
          ),
      });
      const testLayer = createTestLayer(mockProvider);

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        yield* service.sendWhatsAppMessage(
          "invalid-phone" as PhoneNumber,
          "+1987654321" as PhoneNumber,
          "Test message"
        );
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageValidationError);
    });

    it("should validate message content is not empty", async () => {
      const testLayer = createTestLayer();

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        yield* service.sendWhatsAppMessage(
          "+1234567890" as PhoneNumber,
          "+1987654321" as PhoneNumber,
          "" // Empty content should fail
        );
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageValidationError);
    });

    it("should handle provider send errors", async () => {
      const mockProvider = createMockProvider({
        sendMessage: vi.fn().mockImplementation(() =>
          Effect.fail(
            new MessageSendError({
              message: "WhatsApp API error",
              providerId: "twilio",
            })
          )
        ),
      });
      const testLayer = createTestLayer(mockProvider);

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        yield* service.sendWhatsAppMessage(
          "+1234567890" as PhoneNumber,
          "+1987654321" as PhoneNumber,
          "Test message"
        );
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBeInstanceOf(MessageSendError);
    });
  });

  describe("sendWhatsAppTemplate", () => {
    it("should send WhatsApp template message successfully", async () => {
      const mockProvider = createMockProvider();
      const testLayer = createTestLayer(mockProvider);

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        const result = yield* service.sendWhatsAppTemplate(
          "+1234567890" as PhoneNumber,
          "+1987654321" as PhoneNumber,
          "order_confirmation",
          { customerName: "John Doe", orderId: "12345", amount: "$99.99" },
          { orderId: "12345" }
        );

        expect(result.messageId).toBe("WA123456789");
        expect(result.status).toBe("pending");

        // Verify provider was called with template content
        expect(mockProvider.sendMessage).toHaveBeenCalledWith({
          to: "+1234567890",
          from: "+1987654321",
          content: "Template: order_confirmation",
          type: "whatsapp",
          metadata: {
            orderId: "12345",
            templateId: "order_confirmation",
            templateParams: {
              customerName: "John Doe",
              orderId: "12345",
              amount: "$99.99",
            },
          },
        });

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should validate template ID is provided", async () => {
      const testLayer = createTestLayer();

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        yield* service.sendWhatsAppTemplate(
          "+1234567890" as PhoneNumber,
          "+1987654321" as PhoneNumber,
          "", // Empty template ID
          { param1: "value1" }
        );
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageValidationError);
    });

    it("should handle empty template parameters", async () => {
      const mockProvider = createMockProvider();
      const testLayer = createTestLayer(mockProvider);

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        const result = yield* service.sendWhatsAppTemplate(
          "+1234567890" as PhoneNumber,
          "+1987654321" as PhoneNumber,
          "simple_notification",
          {}
        );

        expect(mockProvider.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            content: "Template: simple_notification",
          })
        );

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });
  });

  describe("sendBulkWhatsAppMessage", () => {
    it("should send bulk WhatsApp messages to multiple recipients", async () => {
      const mockProvider = createMockProvider();
      const testLayer = createTestLayer(mockProvider);

      const recipients = [
        "+1234567890" as PhoneNumber,
        "+1234567891" as PhoneNumber,
        "+1234567892" as PhoneNumber,
      ];

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        const results = yield* service.sendBulkWhatsAppMessage(
          recipients,
          "+1987654321" as PhoneNumber,
          "Bulk WhatsApp message",
          { campaign: "bulk-whatsapp" }
        );

        expect(results).toHaveLength(3);
        expect(mockProvider.sendMessage).toHaveBeenCalledTimes(3);

        // Verify each recipient got a message
        recipients.forEach((recipient, index) => {
          expect(mockProvider.sendMessage).toHaveBeenNthCalledWith(index + 1, {
            to: recipient,
            from: "+1987654321",
            content: "Bulk WhatsApp message",
            type: "whatsapp",
            metadata: { campaign: "bulk-whatsapp" },
          });
        });

        return results;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should handle partial failures in bulk sending", async () => {
      let callCount = 0;
      const mockProvider = createMockProvider({
        sendMessage: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            return Effect.fail(
              new MessageSendError({
                message: "Rate limit exceeded",
                providerId: "twilio",
              })
            );
          }
          return Effect.succeed({
            messageId: `WA${callCount}` as MessageId,
            status: "pending" as const,
            estimatedCost: 0.005,
            providerId: "twilio",
          });
        }),
      });
      const testLayer = createTestLayer(mockProvider);

      const recipients = [
        "+1234567890" as PhoneNumber,
        "+1234567891" as PhoneNumber,
        "+1234567892" as PhoneNumber,
      ];

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        yield* service.sendBulkWhatsAppMessage(
          recipients,
          "+1987654321" as PhoneNumber,
          "Bulk message"
        );
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageSendError);
    });

    it("should validate all recipient phone numbers", async () => {
      const mockProvider = createMockProvider({
        validatePhoneNumber: vi
          .fn()
          .mockImplementation((phoneNumber: PhoneNumber) =>
            phoneNumber.includes("invalid")
              ? Effect.fail(
                  new MessageValidationError({
                    message: "Invalid phone number format",
                    field: "phoneNumber",
                  })
                )
              : Effect.succeed(true)
          ),
      });
      const testLayer = createTestLayer(mockProvider);

      const recipients = [
        "+1234567890" as PhoneNumber,
        "invalid-phone" as PhoneNumber, // Invalid number
        "+1234567892" as PhoneNumber,
      ];

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        yield* service.sendBulkWhatsAppMessage(
          recipients,
          "+1987654321" as PhoneNumber,
          "Bulk message"
        );
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageValidationError);
    });
  });

  describe("getWhatsAppDeliveryReport", () => {
    it("should retrieve WhatsApp delivery report successfully", async () => {
      const mockProvider = createMockProvider({
        getMessageStatus: {
          type: "whatsapp",
          status: "read",
          metadata: { providerId: "twilio", readAt: "2024-01-01T10:05:00Z" },
        },
      });
      const testLayer = createTestLayer(mockProvider);

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        const result = yield* service.getWhatsAppDeliveryReport(
          "WA123456789" as MessageId
        );

        expect(result.id).toBe("WA123456789");
        expect(result.type).toBe("whatsapp");
        expect(result.status).toBe("read");
        expect(result.metadata.providerId).toBe("twilio");

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should handle message not found errors", async () => {
      const mockProvider = createMockProvider({
        getMessageStatus: vi
          .fn()
          .mockImplementation(() =>
            Effect.fail(
              new MessageNotFoundError({
                messageId: "WA999999999" as MessageId,
              })
            )
          ),
      });
      const testLayer = createTestLayer(mockProvider);

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        yield* service.getWhatsAppDeliveryReport("WA999999999" as MessageId);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageNotFoundError);
    });
  });

  describe("verifyWhatsAppBusiness", () => {
    it("should verify WhatsApp business number successfully", async () => {
      const mockProvider = createMockProvider();
      const testLayer = createTestLayer(mockProvider);

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        const result = yield* service.verifyWhatsAppBusiness(
          "+1234567890" as PhoneNumber
        );

        expect(result).toBe(true);
        expect(mockProvider.validatePhoneNumber).toHaveBeenCalledWith(
          "+1234567890"
        );

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should fail verification for invalid phone format", async () => {
      const testLayer = createTestLayer();

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        yield* service.verifyWhatsAppBusiness("invalid-phone" as PhoneNumber);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageValidationError);
    });
  });

  describe("Input Validation", () => {
    it("should validate phone number format", async () => {
      const testLayer = createTestLayer();

      const invalidPhoneNumbers = [
        "1234567890", // Missing +
        "+", // Just +
        "", // Empty
        "abc", // Non-numeric
        "+1", // Too short
      ];

      for (const invalidPhone of invalidPhoneNumbers) {
        const program = Effect.gen(function* () {
          const service = yield* WhatsAppService;
          yield* service.sendWhatsAppMessage(
            invalidPhone as PhoneNumber,
            "+1987654321" as PhoneNumber,
            "Test"
          );
        });

        const result = Effect.runPromise(
          program.pipe(Effect.provide(testLayer), Effect.flip)
        );

        await expect(result).resolves.toBeInstanceOf(MessageValidationError);
      }
    });

    it("should validate message content length", async () => {
      const testLayer = createTestLayer();

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        yield* service.sendWhatsAppMessage(
          "+1234567890" as PhoneNumber,
          "+1987654321" as PhoneNumber,
          "a".repeat(4097) // Too long for WhatsApp
        );
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageValidationError);
    });
  });

  describe("Error Handling", () => {
    it("should preserve error context from provider", async () => {
      const originalError = new MessageSendError({
        message: "WhatsApp API quota exceeded",
        providerId: "twilio",
        cause: { quotaLimit: 1000, quotaUsed: 1001 },
      });

      const mockProvider = createMockProvider({
        sendMessage: vi
          .fn()
          .mockImplementation(() => Effect.fail(originalError)),
      });
      const testLayer = createTestLayer(mockProvider);

      const program = Effect.gen(function* () {
        const service = yield* WhatsAppService;
        yield* service.sendWhatsAppMessage(
          "+1234567890" as PhoneNumber,
          "+1987654321" as PhoneNumber,
          "Test"
        );
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBe(originalError); // Should preserve the original error
      expect(error.cause).toEqual({ quotaLimit: 1000, quotaUsed: 1001 });
    });
  });
});
