import { describe, it, expect, vi } from "@effect/vitest";
import { Effect, Layer } from "effect";
import {
  TwilioApiClient,
  TwilioApiClientLive,
} from "../../src/infrastructure/messaging/twilio/api-client";
import { TwilioConfig } from "../../src/infrastructure/messaging/twilio/config";
import {
  MessageProviderError,
  MessageValidationError,
  type ApiSendMessageInput,
  type MessageId,
  type PhoneNumber,
  type MessageContent,
} from "../../src/domain/global/messaging/models";

// Mock fetch for testing
const createMockFetch = (overrides: any = {}) => {
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
              ...overrides.sendMessage,
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
              ...overrides.getMessage,
            }),
            { status: 200 }
          )
        );
      }

      // Mock Twilio Lookup API
      if (url.includes("lookups.twilio.com")) {
        if (overrides.lookupError) {
          return Promise.resolve(new Response("Not Found", { status: 404 }));
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              phone_number: "+1234567890",
              country_code: "US",
              ...overrides.lookup,
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

// Helper to create test layer with mocked fetch
const createTestLayer = (mockFetch?: any) => {
  if (mockFetch) {
    globalThis.fetch = mockFetch;
  }

  const TwilioConfigLayer = Layer.succeed(TwilioConfig, {
    accountSid: "test-account-sid",
    authToken: "test-auth-token",
    fromNumber: "+1987654321" as PhoneNumber,
    webhookUrl: "https://webhook.example.com",
  });

  return Layer.provide(TwilioApiClientLive, TwilioConfigLayer);
};

describe("TwilioApiClient", () => {
  describe("sendMessage", () => {
    it("should send message successfully with valid schema input", async () => {
      const mockFetch = createMockFetch();
      const testLayer = createTestLayer(mockFetch);

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

        // Verify fetch was called with correct parameters
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const callArgs = mockFetch.mock.calls[0];

        // First argument should be a Request object
        expect(callArgs[0]).toBeInstanceOf(Request);
        const request = callArgs[0] as Request;

        // Verify request properties
        expect(request.url).toContain("/Messages.json");
        expect(request.method).toBe("POST");
        expect(request.headers.get("Authorization")).toContain("Basic");
        expect(request.headers.get("Content-Type")).toBe(
          "application/x-www-form-urlencoded"
        );

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should validate input schema and reject invalid phone numbers", async () => {
      const mockFetch = createMockFetch();
      const testLayer = createTestLayer(mockFetch);

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
      const mockFetch = createMockFetch();
      const testLayer = createTestLayer(mockFetch);

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
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const testLayer = createTestLayer(mockFetch);

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

    it("should handle Twilio error responses", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 21211,
            message: "Invalid 'To' Phone Number",
            more_info: "https://www.twilio.com/docs/errors/21211",
          }),
          { status: 400 }
        )
      );

      const testLayer = createTestLayer(mockFetch);

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
      expect(error.message).toContain("Twilio API error 400");
    });
  });

  describe("getMessage", () => {
    it("should retrieve message successfully", async () => {
      const mockFetch = createMockFetch();
      const testLayer = createTestLayer(mockFetch);

      const messageId = "SM123456789" as MessageId;

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        const result = yield* client.getMessage(messageId);

        expect(result.sid).toBe("SM123456789");
        expect(result.status).toBe("delivered");
        expect(result.body).toBe("Test message");
        expect(result.to).toBe("+1234567890");
        expect(result.from).toBe("+1987654321");

        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should handle message not found", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(new Response("Not Found", { status: 404 }));
      const testLayer = createTestLayer(mockFetch);

      const messageId = "SM_NONEXISTENT" as MessageId;

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        yield* client.getMessage(messageId);
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBeInstanceOf(MessageProviderError);
    });
  });

  describe("validatePhoneNumber", () => {
    it("should validate phone number successfully", async () => {
      const mockFetch = createMockFetch();
      const testLayer = createTestLayer(mockFetch);

      const phoneNumber = "+1234567890" as PhoneNumber;

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        const result = yield* client.validatePhoneNumber(phoneNumber);

        expect(result).toBe(true);
        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should handle invalid phone number", async () => {
      const mockFetch = createMockFetch({ lookupError: true });
      const testLayer = createTestLayer(mockFetch);

      const phoneNumber = "+1234567890" as PhoneNumber;

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        const result = yield* client.validatePhoneNumber(phoneNumber);

        expect(result).toBe(false);
        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });
  });

  describe("healthCheck", () => {
    it("should perform health check successfully", async () => {
      const mockFetch = createMockFetch();
      const testLayer = createTestLayer(mockFetch);

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        const result = yield* client.healthCheck();

        expect(result).toBe(true);
        return result;
      });

      await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
    });

    it("should handle health check failure", async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error("Service unavailable"));
      const testLayer = createTestLayer(mockFetch);

      const program = Effect.gen(function* () {
        const client = yield* TwilioApiClient;
        yield* client.healthCheck();
      });

      const result = Effect.runPromise(
        program.pipe(Effect.provide(testLayer), Effect.flip)
      );

      const error = await result;
      expect(error).toBeInstanceOf(MessageProviderError);
      expect(error.message).toContain("Twilio health check failed");
    });
  });
});
