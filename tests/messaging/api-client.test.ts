import { describe, it, expect, vi } from "@effect/vitest";
import { Effect, Layer } from "effect";
import {
  TwilioApiClient,
  TwilioSDKService,
  TwilioApiClientLive,
} from "../../src/infrastructure/messaging/twilio/api-client";
import {
  MessageProviderError,
  MessageValidationError,
  type ApiSendMessageInput,
  type MessageId,
  type PhoneNumber,
  type MessageContent,
  validatePhoneNumber,
  validateMessageContent,
  validateMessageId,
} from "../../src/domain/global/messaging/models";
import type { Twilio } from "twilio";

// Mock Twilio SDK
const createMockTwilioSDK = (overrides: Partial<any> = {}): Twilio =>
  ({
    messages: {
      create: vi.fn().mockResolvedValue({
        sid: "SM123456789",
        status: "queued",
        dateCreated: new Date("2024-01-01T10:00:00Z"),
        price: "0.0075",
        errorCode: null,
        errorMessage: null,
        ...overrides.create,
      }),
      ...overrides.messages,
    } as any,
    lookups: {
      v1: {
        phoneNumbers: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue({
            phoneNumber: "+1234567890",
            countryCode: "US",
            ...overrides.lookup,
          }),
        }),
      },
    } as any,
  } as unknown as Twilio);

// Helper to create test layer with mocked Twilio SDK
const createTestLayer = (mockSdk: Twilio) => {
  const MockTwilioSDKLayer = Layer.succeed(TwilioSDKService, { sdk: mockSdk });
  return Layer.provide(TwilioApiClientLive, MockTwilioSDKLayer);
};

describe("TwilioApiClient", () => {
  describe("sendMessage", () => {
    it("should send message successfully with valid schema input", async () => {
      const mockSdk = createMockTwilioSDK();
      const testLayer = createTestLayer(mockSdk);

      const input: ApiSendMessageInput = {
        to: "+1234567890" as PhoneNumber,
        from: "+1987654321" as PhoneNumber,
        body: "Hello World!" as MessageContent,
        options: {
          statusCallback: "https://webhook.example.com",
          provideFeedback: true,
          mediaUrl: ["https://example.com/image.jpg"],
        },
      };

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        const result = yield* client.sendMessage(input);

        expect(result.sid).toBe("SM123456789");
        expect(result.status).toBe("queued");
        expect(result.dateCreated).toEqual(new Date("2024-01-01T10:00:00Z"));
        expect(result.price).toBe("0.0075");

        // Verify Twilio SDK was called with correct parameters
        expect(mockSdk.messages.create).toHaveBeenCalledWith({
          to: "+1234567890",
          from: "+1987654321",
          body: "Hello World!",
          statusCallback: "https://webhook.example.com",
          provideFeedback: true,
          mediaUrl: ["https://example.com/image.jpg"],
        });

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should validate input schema and reject invalid phone numbers", async () => {
      const mockSdk = createMockTwilioSDK();
      const testLayer = createTestLayer(mockSdk);

      const invalidInput = {
        to: "invalid-phone" as PhoneNumber, // Invalid phone format
        from: "+1987654321" as PhoneNumber,
        body: "Hello World!" as MessageContent,
      } as ApiSendMessageInput;

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        yield* client.sendMessage(invalidInput);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageValidationError);
    });

    it("should validate input schema and reject empty message content", async () => {
      const mockSdk = createMockTwilioSDK();
      const testLayer = createTestLayer(mockSdk);

      const invalidInput = {
        to: "+1234567890" as PhoneNumber,
        from: "+1987654321" as PhoneNumber,
        body: "" as MessageContent, // Empty content (invalid)
      } as ApiSendMessageInput;

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        yield* client.sendMessage(invalidInput);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageValidationError);
    });

    it("should handle Twilio API errors", async () => {
      const mockSdk = createMockTwilioSDK();
      // Mock Twilio to throw an error
      vi.mocked(mockSdk.messages.create).mockRejectedValue(
        new Error("Twilio API rate limit exceeded")
      );

      const testLayer = createTestLayer(mockSdk);

      const input: ApiSendMessageInput = {
        to: "+1234567890" as PhoneNumber,
        from: "+1987654321" as PhoneNumber,
        body: "Hello World!" as MessageContent,
      };

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        yield* client.sendMessage(input);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBeInstanceOf(MessageProviderError);
      expect(error.message).toContain("Twilio sendMessage failed");
      expect(error.providerId).toBe("twilio");
    });

    it("should handle Twilio error codes in response", async () => {
      const mockSdk = createMockTwilioSDK({
        create: {
          sid: "SM123456789",
          status: "failed",
          errorCode: 21211,
          errorMessage: "Invalid 'To' Phone Number",
        },
      });

      const testLayer = createTestLayer(mockSdk);

      const input: ApiSendMessageInput = {
        to: "+1234567890" as PhoneNumber,
        from: "+1987654321" as PhoneNumber,
        body: "Hello World!" as MessageContent,
      };

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        yield* client.sendMessage(input);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBeInstanceOf(MessageProviderError);
      expect(error.message).toContain("Twilio error 21211");
    });

    it("should validate output schema from Twilio response", async () => {
      const mockSdk = createMockTwilioSDK({
        create: {
          // Missing required fields to test output validation
          status: "queued",
          dateCreated: "invalid-date", // Invalid date format
        },
      });

      const testLayer = createTestLayer(mockSdk);

      const input: ApiSendMessageInput = {
        to: "+1234567890" as PhoneNumber,
        from: "+1987654321" as PhoneNumber,
        body: "Hello World!" as MessageContent,
      };

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        yield* client.sendMessage(input);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBeInstanceOf(MessageValidationError);
      expect(error.message).toContain("Invalid Twilio response");
    });
  });

  describe("getMessage", () => {
    it("should retrieve message successfully", async () => {
      const mockMessage = {
        sid: "SM123456789",
        status: "delivered",
        body: "Hello World!",
        to: "+1234567890",
        from: "+1987654321",
        dateCreated: new Date("2024-01-01T10:00:00Z"),
        dateUpdated: new Date("2024-01-01T10:05:00Z"),
        errorCode: null,
      };

      const mockSdk = createMockTwilioSDK();
      const mockFetch = vi.fn().mockResolvedValue(mockMessage);
      vi.mocked(mockSdk.messages as any).mockReturnValue({ fetch: mockFetch });

      const testLayer = createTestLayer(mockSdk);

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        const result = yield* client.getMessage("SM123456789" as MessageId);

        expect(result.sid).toBe("SM123456789");
        expect(result.status).toBe("delivered");
        expect(result.body).toBe("Hello World!");
        expect(result.to).toBe("+1234567890");
        expect(result.from).toBe("+1987654321");

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should validate message ID input", async () => {
      const mockSdk = createMockTwilioSDK();
      const testLayer = createTestLayer(mockSdk);

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        // Pass empty string as message ID (should fail validation)
        yield* client.getMessage("" as MessageId);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageValidationError);
    });

    it("should handle Twilio API errors for getMessage", async () => {
      const mockSdk = createMockTwilioSDK();
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error("Message not found"));
      vi.mocked(mockSdk.messages as any).mockReturnValue({ fetch: mockFetch });

      const testLayer = createTestLayer(mockSdk);

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        yield* client.getMessage("SM999999999" as MessageId);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBeInstanceOf(MessageProviderError);
      expect(error.message).toContain("Twilio getMessage failed");
    });
  });

  describe("validatePhoneNumber", () => {
    it("should validate phone number using domain validation and Twilio", async () => {
      const mockSdk = createMockTwilioSDK();
      const testLayer = createTestLayer(mockSdk);

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        const result = yield* client.validatePhoneNumber(
          "+1234567890" as PhoneNumber
        );

        expect(result).toBe(true);
        expect(mockSdk.lookups.v1.phoneNumbers).toHaveBeenCalledWith(
          "+1234567890"
        );

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should fail validation for invalid phone format", async () => {
      const mockSdk = createMockTwilioSDK();
      const testLayer = createTestLayer(mockSdk);

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        yield* client.validatePhoneNumber("invalid-phone" as PhoneNumber);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      await expect(result).resolves.toBeInstanceOf(MessageValidationError);
    });

    it("should handle Twilio lookup API errors", async () => {
      const mockSdk = createMockTwilioSDK();
      const mockLookupFetch = vi
        .fn()
        .mockRejectedValue(new Error("Lookup failed"));
      vi.mocked(mockSdk.lookups.v1.phoneNumbers as any).mockReturnValue({
        fetch: mockLookupFetch,
      });

      const testLayer = createTestLayer(mockSdk);

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        yield* client.validatePhoneNumber("+1234567890" as PhoneNumber);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBeInstanceOf(MessageProviderError);
      expect(error.message).toContain("Twilio validatePhoneNumber failed");
    });
  });
});

describe("Schema Validation Functions", () => {
  describe("validatePhoneNumber", () => {
    it("should accept valid E.164 phone numbers", async () => {
      const validNumbers = ["+1234567890", "+447123456789", "+81312345678"];

      for (const number of validNumbers) {
        const result = await Effect.runPromise(validatePhoneNumber(number));
        expect(result).toBe(number);
      }
    });

    it("should reject invalid phone numbers", async () => {
      const invalidNumbers = ["1234567890", "invalid", "", "+"];

      for (const number of invalidNumbers) {
        const result = Effect.runPromise(
          validatePhoneNumber(number).pipe(Effect.flip)
        );
        await expect(result).resolves.toBeInstanceOf(MessageValidationError);
      }
    });
  });

  describe("validateMessageContent", () => {
    it("should accept valid message content", async () => {
      const validContent = "Hello World!";
      const result = await Effect.runPromise(
        validateMessageContent(validContent)
      );
      expect(result).toBe(validContent);
    });

    it("should reject empty or too long content", async () => {
      const invalidContent = ["", "a".repeat(1601)];

      for (const content of invalidContent) {
        const result = Effect.runPromise(
          validateMessageContent(content).pipe(Effect.flip)
        );
        await expect(result).resolves.toBeInstanceOf(MessageValidationError);
      }
    });
  });

  describe("validateMessageId", () => {
    it("should accept valid message IDs", async () => {
      const validIds = ["SM123456789", "test-message-id", "msg_12345"];

      for (const id of validIds) {
        const result = await Effect.runPromise(validateMessageId(id));
        expect(result).toBe(id);
      }
    });

    it("should reject empty message IDs", async () => {
      const result = Effect.runPromise(validateMessageId("").pipe(Effect.flip));
      await expect(result).resolves.toBeInstanceOf(MessageValidationError);
    });
  });
});
