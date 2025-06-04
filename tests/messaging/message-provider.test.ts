import { describe, it, expect, vi } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { TwilioMessageProviderLive } from "../../src/infrastructure/messaging/twilio/message-provider";
import { TwilioApiClient } from "../../src/infrastructure/messaging/twilio/api-client";
import { TwilioConfig } from "../../src/infrastructure/messaging/twilio/config";
import { MessageProviderService } from "../../src/domain/global/messaging/service";
import {
  MessageSendError,
  MessageValidationError,
  MessageProviderError,
  MessageNotFoundError,
  type SendMessageRequest,
  type MessageId,
  type PhoneNumber,
  type MessageContent,
  type ApiSendMessageInput,
  type ApiSendMessageOutput,
  type ApiGetMessageOutput,
  type MessageProviderConfig,
} from "../../src/domain/global/messaging/models";

// Mock API Client
const createMockApiClient = (overrides: Partial<any> = {}) => ({
  sendMessage: vi.fn().mockImplementation((input: ApiSendMessageInput) =>
    Effect.succeed({
      sid: "SM123456789" as MessageId,
      status: "queued",
      dateCreated: new Date("2024-01-01T10:00:00Z"),
      price: "0.0075",
      ...overrides.sendMessage,
    } as ApiSendMessageOutput)
  ),
  getMessage: vi.fn().mockImplementation((messageId: MessageId) =>
    Effect.succeed({
      sid: messageId,
      status: "delivered",
      body: "Test message" as MessageContent,
      to: "+1234567890" as PhoneNumber,
      from: "+1987654321" as PhoneNumber,
      dateCreated: new Date("2024-01-01T10:00:00Z"),
      dateUpdated: new Date("2024-01-01T10:05:00Z"),
      ...overrides.getMessage,
    } as ApiGetMessageOutput)
  ),
  validatePhoneNumber: vi
    .fn()
    .mockImplementation((phoneNumber: PhoneNumber) => Effect.succeed(true)),
  ...overrides,
});

// Mock Config
const mockConfig: MessageProviderConfig = {
  accountSid: "test-account-sid",
  authToken: "test-auth-token",
  fromNumber: "+1987654321" as PhoneNumber,
  webhookUrl: "https://webhook.example.com",
};

// Helper to create test layer
const createTestLayer = (mockApiClient: any = createMockApiClient()) => {
  const MockApiClientLayer = Layer.succeed(TwilioApiClient, mockApiClient);
  const MockConfigLayer = Layer.succeed(TwilioConfig, { config: mockConfig });

  return Layer.provide(
    TwilioMessageProviderLive,
    Layer.merge(MockApiClientLayer, MockConfigLayer)
  );
};

describe("TwilioMessageProvider", () => {
  describe("sendMessage", () => {
    it("should send message successfully using schema-driven API", async () => {
      const mockApiClient = createMockApiClient();
      const testLayer = createTestLayer(mockApiClient);

      const request: SendMessageRequest = {
        to: "+1234567890" as PhoneNumber,
        from: "+1987654321" as PhoneNumber,
        content: "Hello World!" as MessageContent,
        type: "sms",
        metadata: { campaign: "test" },
      };

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        const result = yield* provider.sendMessage(request);

        expect(result.messageId).toBe("SM123456789");
        expect(result.status).toBe("pending"); // Mapped from "queued"
        expect(result.estimatedCost).toBe(0.0075);
        expect(result.providerId).toBe("twilio");

        // Verify API client was called with correct schema input
        expect(mockApiClient.sendMessage).toHaveBeenCalledWith({
          to: "+1234567890",
          from: "+1987654321",
          body: "Hello World!",
          options: {
            statusCallback: "https://webhook.example.com",
            provideFeedback: true,
          },
        });

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should map Twilio status codes correctly", async () => {
      const statusMappings = [
        { twilioStatus: "queued", expectedStatus: "pending" },
        { twilioStatus: "accepted", expectedStatus: "pending" },
        { twilioStatus: "sent", expectedStatus: "sent" },
        { twilioStatus: "delivered", expectedStatus: "delivered" },
        { twilioStatus: "failed", expectedStatus: "failed" },
        { twilioStatus: "undelivered", expectedStatus: "failed" },
        { twilioStatus: "read", expectedStatus: "read" },
        { twilioStatus: "unknown", expectedStatus: "pending" },
      ];

      for (const { twilioStatus, expectedStatus } of statusMappings) {
        const mockApiClient = createMockApiClient({
          sendMessage: { status: twilioStatus },
        });
        const testLayer = createTestLayer(mockApiClient);

        const request: SendMessageRequest = {
          to: "+1234567890" as PhoneNumber,
          from: "+1987654321" as PhoneNumber,
          content: "Test" as MessageContent,
          type: "sms",
        };

        const program = Effect.gen(function* () {
          const provider = yield* MessageProviderService;
          const result = yield* provider.sendMessage(request);
          expect(result.status).toBe(expectedStatus);
          return result;
        });

        await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
      }
    });

    it("should handle API client errors", async () => {
      const mockApiClient = createMockApiClient({
        sendMessage: vi.fn().mockImplementation(() =>
          Effect.fail(
            new MessageProviderError({
              message: "Twilio API error",
              providerId: "twilio",
            })
          )
        ),
      });
      const testLayer = createTestLayer(mockApiClient);

      const request: SendMessageRequest = {
        to: "+1234567890" as PhoneNumber,
        from: "+1987654321" as PhoneNumber,
        content: "Test" as MessageContent,
        type: "sms",
      };

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        yield* provider.sendMessage(request);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBeInstanceOf(MessageSendError);
      expect(error.message).toContain("Failed to send message via Twilio");
    });

    it("should include webhook configuration in API calls", async () => {
      const mockApiClient = createMockApiClient();
      const testLayer = createTestLayer(mockApiClient);

      const request: SendMessageRequest = {
        to: "+1234567890" as PhoneNumber,
        from: "+1987654321" as PhoneNumber,
        content: "Test" as MessageContent,
        type: "sms",
      };

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        yield* provider.sendMessage(request);
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(mockApiClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            statusCallback: "https://webhook.example.com",
            provideFeedback: true,
          }),
        })
      );
    });
  });

  describe("getMessageStatus", () => {
    it("should retrieve message status successfully", async () => {
      const mockApiClient = createMockApiClient();
      const testLayer = createTestLayer(mockApiClient);

      const messageId = "SM123456789" as MessageId;

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        const result = yield* provider.getMessageStatus(messageId);

        expect(result.id).toBe(messageId);
        expect(result.to).toBe("+1234567890");
        expect(result.from).toBe("+1987654321");
        expect(result.content).toBe("Test message");
        expect(result.type).toBe("sms"); // Determined by content analysis
        expect(result.status).toBe("delivered");
        expect(result.metadata).toEqual({ providerId: "twilio" });

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should detect WhatsApp message type from content", async () => {
      const mockApiClient = createMockApiClient({
        getMessage: {
          body: "Template: Your order is ready" as MessageContent,
        },
      });
      const testLayer = createTestLayer(mockApiClient);

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        const result = yield* provider.getMessageStatus(
          "SM123456789" as MessageId
        );

        expect(result.type).toBe("whatsapp");
        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should handle message not found errors", async () => {
      const mockApiClient = createMockApiClient({
        getMessage: vi.fn().mockImplementation(() =>
          Effect.fail(
            new MessageProviderError({
              message: "Message not found",
              providerId: "twilio",
            })
          )
        ),
      });
      const testLayer = createTestLayer(mockApiClient);

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        yield* provider.getMessageStatus("SM999999999" as MessageId);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBeInstanceOf(MessageNotFoundError);
    });

    it("should handle other provider errors", async () => {
      const mockApiClient = createMockApiClient({
        getMessage: vi.fn().mockImplementation(() =>
          Effect.fail(
            new MessageProviderError({
              message: "Rate limit exceeded",
              providerId: "twilio",
            })
          )
        ),
      });
      const testLayer = createTestLayer(mockApiClient);

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        yield* provider.getMessageStatus("SM123456789" as MessageId);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBeInstanceOf(MessageProviderError);
      expect(error.message).toContain("Failed to get message status");
    });
  });

  describe("validatePhoneNumber", () => {
    it("should validate phone number using domain and provider validation", async () => {
      const mockApiClient = createMockApiClient();
      const testLayer = createTestLayer(mockApiClient);

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        const result = yield* provider.validatePhoneNumber(
          "+1234567890" as PhoneNumber
        );

        expect(result).toBe(true);
        expect(mockApiClient.validatePhoneNumber).toHaveBeenCalledWith(
          "+1234567890"
        );

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should fail validation for invalid phone format", async () => {
      const testLayer = createTestLayer();

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        yield* provider.validatePhoneNumber("invalid-phone" as PhoneNumber);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageValidationError);
    });

    it("should handle provider validation errors", async () => {
      const mockApiClient = createMockApiClient({
        validatePhoneNumber: vi.fn().mockImplementation(() =>
          Effect.fail(
            new MessageProviderError({
              message: "Lookup service unavailable",
              providerId: "twilio",
            })
          )
        ),
      });
      const testLayer = createTestLayer(mockApiClient);

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        yield* provider.validatePhoneNumber("+1234567890" as PhoneNumber);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBeInstanceOf(MessageValidationError);
      expect(error.message).toContain("Phone number validation failed");
    });
  });

  describe("getProviderHealth", () => {
    it("should return healthy status when validation succeeds", async () => {
      const mockApiClient = createMockApiClient();
      const testLayer = createTestLayer(mockApiClient);

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        const result = yield* provider.getProviderHealth();

        expect(result).toBe(true);
        expect(mockApiClient.validatePhoneNumber).toHaveBeenCalledWith(
          "+1234567890"
        );

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should return unhealthy status when validation fails", async () => {
      const mockApiClient = createMockApiClient({
        validatePhoneNumber: vi.fn().mockImplementation(() =>
          Effect.fail(
            new MessageProviderError({
              message: "Service unavailable",
              providerId: "twilio",
            })
          )
        ),
      });
      const testLayer = createTestLayer(mockApiClient);

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        const result = yield* provider.getProviderHealth();

        expect(result).toBe(false);
        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });
  });

  describe("Configuration", () => {
    it("should use configuration from TwilioConfig", async () => {
      const customConfig: MessageProviderConfig = {
        accountSid: "custom-account",
        authToken: "custom-token",
        fromNumber: "+1111111111" as PhoneNumber,
        webhookUrl: "https://custom-webhook.com",
      };

      const mockApiClient = createMockApiClient();
      const CustomConfigLayer = Layer.succeed(TwilioConfig, {
        config: customConfig,
      });
      const MockApiClientLayer = Layer.succeed(TwilioApiClient, mockApiClient);

      const testLayer = Layer.provide(
        TwilioMessageProviderLive,
        Layer.merge(MockApiClientLayer, CustomConfigLayer)
      );

      const request: SendMessageRequest = {
        to: "+1234567890" as PhoneNumber,
        from: "+1987654321" as PhoneNumber,
        content: "Test" as MessageContent,
        type: "sms",
      };

      const program = Effect.gen(function* () {
        const provider = yield* MessageProviderService;
        yield* provider.sendMessage(request);
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));

      expect(mockApiClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            statusCallback: "https://custom-webhook.com",
          }),
        })
      );
    });
  });
});
