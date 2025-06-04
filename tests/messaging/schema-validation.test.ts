import { describe, it, expect } from "@effect/vitest";
import { Effect, Schema as S } from "effect";
import {
  MessageValidationError,
  type PhoneNumber,
  type MessageContent,
  type MessageId,
  validatePhoneNumber,
  validateMessageContent,
  validateMessageId,
  ApiSendMessageInputSchema,
  ApiSendMessageOutputSchema,
  ApiGetMessageOutputSchema,
} from "../../src/domain/global/messaging/models";

describe("Schema Validation Functions", () => {
  describe("validatePhoneNumber", () => {
    it("should accept valid E.164 phone numbers", async () => {
      const validNumbers = [
        "+1234567890",
        "+447123456789",
        "+81312345678",
        "+5511999999999",
        "+33123456789",
      ];

      for (const number of validNumbers) {
        const result = await Effect.runPromise(validatePhoneNumber(number));
        expect(result).toBe(number);
      }
    });

    it("should reject invalid phone numbers", async () => {
      const invalidNumbers = [
        "1234567890", // Missing +
        "invalid", // Non-numeric
        "", // Empty
        "+", // Just +
        "+1", // Too short
        "+12345678901234567890", // Too long
        "++1234567890", // Double +
        "+1-234-567-890", // With dashes
      ];

      for (const number of invalidNumbers) {
        const result = Effect.runPromise(
          validatePhoneNumber(number).pipe(Effect.flip)
        );
        const error = await result;
        expect(error).toBeInstanceOf(MessageValidationError);
        expect(error.field).toBe("phoneNumber");
      }
    });
  });

  describe("validateMessageContent", () => {
    it("should accept valid message content", async () => {
      const validContent = [
        "Hello World!",
        "Test message with emojis 🎉",
        "A".repeat(1600), // Max length
        "Simple text",
        "Message with\nnewlines",
      ];

      for (const content of validContent) {
        const result = await Effect.runPromise(validateMessageContent(content));
        expect(result).toBe(content);
      }
    });

    it("should reject invalid message content", async () => {
      const invalidContent = [
        "", // Empty
        "A".repeat(1601), // Too long
      ];

      for (const content of invalidContent) {
        const result = Effect.runPromise(
          validateMessageContent(content).pipe(Effect.flip)
        );
        const error = await result;
        expect(error).toBeInstanceOf(MessageValidationError);
        expect(error.field).toBe("content");
      }
    });
  });

  describe("validateMessageId", () => {
    it("should accept valid message IDs", async () => {
      const validIds = [
        "SM123456789",
        "test-message-id",
        "msg_12345",
        "WA1234567890abcdef",
        "unique-id-2024",
      ];

      for (const id of validIds) {
        const result = await Effect.runPromise(validateMessageId(id));
        expect(result).toBe(id);
      }
    });

    it("should reject empty message IDs", async () => {
      const result = Effect.runPromise(validateMessageId("").pipe(Effect.flip));
      const error = await result;
      expect(error).toBeInstanceOf(MessageValidationError);
      expect(error.field).toBe("messageId");
    });
  });
});

describe("API Schema Validation", () => {
  describe("ApiSendMessageInputSchema", () => {
    it("should validate complete send message input", async () => {
      const validInput = {
        to: "+1234567890" as PhoneNumber,
        from: "+1987654321" as PhoneNumber,
        body: "Hello World!" as MessageContent,
        options: {
          statusCallback: "https://webhook.example.com",
          provideFeedback: true,
          mediaUrl: ["https://example.com/image.jpg"],
        },
      };

      const result = await Effect.runPromise(
        S.decodeUnknown(ApiSendMessageInputSchema)(validInput)
      );

      expect(result.to).toBe("+1234567890");
      expect(result.from).toBe("+1987654321");
      expect(result.body).toBe("Hello World!");
      expect(result.options?.statusCallback).toBe(
        "https://webhook.example.com"
      );
      expect(result.options?.provideFeedback).toBe(true);
      expect(result.options?.mediaUrl).toEqual([
        "https://example.com/image.jpg",
      ]);
    });

    it("should validate minimal send message input", async () => {
      const minimalInput = {
        to: "+1234567890" as PhoneNumber,
        from: "+1987654321" as PhoneNumber,
        body: "Hello!" as MessageContent,
      };

      const result = await Effect.runPromise(
        S.decodeUnknown(ApiSendMessageInputSchema)(minimalInput)
      );

      expect(result.to).toBe("+1234567890");
      expect(result.from).toBe("+1987654321");
      expect(result.body).toBe("Hello!");
      expect(result.options).toBeUndefined();
    });

    it("should reject invalid send message input", async () => {
      const invalidInputs = [
        {
          // Missing required fields
          to: "+1234567890",
          body: "Hello",
        },
        {
          to: "invalid-phone", // Invalid phone format
          from: "+1987654321",
          body: "Hello",
        },
        {
          to: "+1234567890",
          from: "+1987654321",
          body: "", // Empty content
        },
        {
          to: "+1234567890",
          from: "+1987654321",
          body: "Hello",
          options: {
            statusCallback: "not-a-url", // Invalid URL
          },
        },
      ];

      for (const input of invalidInputs) {
        const result = Effect.runPromise(
          S.decodeUnknown(ApiSendMessageInputSchema)(input).pipe(Effect.flip)
        );
        const error = await result;
        expect(error).toBeDefined();
      }
    });
  });

  describe("ApiSendMessageOutputSchema", () => {
    it("should validate complete send message output", async () => {
      const validOutput = {
        sid: "SM123456789" as MessageId,
        status: "queued",
        dateCreated: new Date("2024-01-01T10:00:00Z"),
        price: "0.0075",
      };

      const result = await Effect.runPromise(
        S.decodeUnknown(ApiSendMessageOutputSchema)(validOutput)
      );

      expect(result.sid).toBe("SM123456789");
      expect(result.status).toBe("queued");
      expect(result.dateCreated).toEqual(new Date("2024-01-01T10:00:00Z"));
      expect(result.price).toBe("0.0075");
    });

    it("should validate minimal send message output", async () => {
      const minimalOutput = {
        sid: "SM123456789" as MessageId,
        status: "queued",
        dateCreated: new Date("2024-01-01T10:00:00Z"),
      };

      const result = await Effect.runPromise(
        S.decodeUnknown(ApiSendMessageOutputSchema)(minimalOutput)
      );

      expect(result.sid).toBe("SM123456789");
      expect(result.status).toBe("queued");
      expect(result.dateCreated).toEqual(new Date("2024-01-01T10:00:00Z"));
      expect(result.price).toBeUndefined();
    });

    it("should reject invalid send message output", async () => {
      const invalidOutputs = [
        {
          // Missing required fields
          status: "queued",
          dateCreated: new Date(),
        },
        {
          sid: "", // Empty sid
          status: "queued",
          dateCreated: new Date(),
        },
        {
          sid: "SM123456789",
          status: "invalid-status", // Invalid status
          dateCreated: new Date(),
        },
        {
          sid: "SM123456789",
          status: "queued",
          dateCreated: "invalid-date", // Invalid date
        },
      ];

      for (const output of invalidOutputs) {
        const result = Effect.runPromise(
          S.decodeUnknown(ApiSendMessageOutputSchema)(output).pipe(Effect.flip)
        );
        const error = await result;
        expect(error).toBeDefined();
      }
    });
  });

  describe("ApiGetMessageOutputSchema", () => {
    it("should validate complete get message output", async () => {
      const validOutput = {
        sid: "SM123456789" as MessageId,
        status: "delivered",
        body: "Hello World!" as MessageContent,
        to: "+1234567890" as PhoneNumber,
        from: "+1987654321" as PhoneNumber,
        dateCreated: new Date("2024-01-01T10:00:00Z"),
        dateUpdated: new Date("2024-01-01T10:05:00Z"),
      };

      const result = await Effect.runPromise(
        S.decodeUnknown(ApiGetMessageOutputSchema)(validOutput)
      );

      expect(result.sid).toBe("SM123456789");
      expect(result.status).toBe("delivered");
      expect(result.body).toBe("Hello World!");
      expect(result.to).toBe("+1234567890");
      expect(result.from).toBe("+1987654321");
      expect(result.dateCreated).toEqual(new Date("2024-01-01T10:00:00Z"));
      expect(result.dateUpdated).toEqual(new Date("2024-01-01T10:05:00Z"));
    });

    it("should reject invalid get message output", async () => {
      const invalidOutputs = [
        {
          // Missing required fields
          status: "delivered",
          body: "Hello",
        },
        {
          sid: "SM123456789",
          status: "delivered",
          body: "", // Empty body
          to: "+1234567890",
          from: "+1987654321",
          dateCreated: new Date(),
          dateUpdated: new Date(),
        },
        {
          sid: "SM123456789",
          status: "delivered",
          body: "Hello",
          to: "invalid-phone", // Invalid phone
          from: "+1987654321",
          dateCreated: new Date(),
          dateUpdated: new Date(),
        },
      ];

      for (const output of invalidOutputs) {
        const result = Effect.runPromise(
          S.decodeUnknown(ApiGetMessageOutputSchema)(output).pipe(Effect.flip)
        );
        const error = await result;
        expect(error).toBeDefined();
      }
    });
  });
});

describe("Schema Integration", () => {
  it("should demonstrate end-to-end schema validation flow", async () => {
    // 1. Start with user input (untyped)
    const userInput = {
      to: "+1234567890",
      from: "+1987654321",
      body: "Hello from schema test!",
      options: {
        statusCallback: "https://webhook.example.com",
        provideFeedback: true,
      },
    };

    // 2. Validate and parse input using schema
    const validatedInput = await Effect.runPromise(
      S.decodeUnknown(ApiSendMessageInputSchema)(userInput)
    );

    expect(validatedInput.to).toBe("+1234567890");
    expect(validatedInput.options?.statusCallback).toBe(
      "https://webhook.example.com"
    );

    // 3. Simulate API response (untyped)
    const apiResponse = {
      sid: "SM987654321",
      status: "accepted",
      dateCreated: new Date("2024-01-01T15:30:00Z"),
      price: "0.0075",
    };

    // 4. Validate and parse output using schema
    const validatedOutput = await Effect.runPromise(
      S.decodeUnknown(ApiSendMessageOutputSchema)(apiResponse)
    );

    expect(validatedOutput.sid).toBe("SM987654321");
    expect(validatedOutput.status).toBe("accepted");
    expect(validatedOutput.price).toBe("0.0075");

    // 5. Demonstrate type safety - these are now properly typed
    const messageId: MessageId = validatedOutput.sid;
    const phoneNumber: PhoneNumber = validatedInput.to;
    const content: MessageContent = validatedInput.body;

    expect(messageId).toBe("SM987654321");
    expect(phoneNumber).toBe("+1234567890");
    expect(content).toBe("Hello from schema test!");
  });

  it("should handle validation errors with detailed information", async () => {
    const invalidInput = {
      to: "invalid-phone",
      from: "+1987654321",
      body: "",
    };

    const result = Effect.runPromise(
      S.decodeUnknown(ApiSendMessageInputSchema)(invalidInput).pipe(Effect.flip)
    );

    const error = await result;
    expect(error).toBeDefined();
    // Error should contain details about which fields failed validation
    expect(String(error)).toContain("Expected");
  });

  it("should demonstrate schema composition and reuse", async () => {
    // Phone number validation is reused across different schemas
    const validPhone = "+1234567890";
    const invalidPhone = "invalid";

    // Test in input schema
    const inputResult = Effect.runPromise(
      S.decodeUnknown(ApiSendMessageInputSchema)({
        to: validPhone,
        from: validPhone,
        body: "Test",
      })
    );

    await expect(inputResult).resolves.toBeDefined();

    // Test in output schema
    const outputResult = Effect.runPromise(
      S.decodeUnknown(ApiGetMessageOutputSchema)({
        sid: "SM123",
        status: "delivered",
        body: "Test",
        to: validPhone,
        from: validPhone,
        dateCreated: new Date(),
        dateUpdated: new Date(),
      })
    );

    await expect(outputResult).resolves.toBeDefined();

    // Test validation failure
    const failResult = Effect.runPromise(
      S.decodeUnknown(ApiSendMessageInputSchema)({
        to: invalidPhone,
        from: validPhone,
        body: "Test",
      }).pipe(Effect.flip)
    );

    await expect(failResult).resolves.toBeDefined();
  });
});
