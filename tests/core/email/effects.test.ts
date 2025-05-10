import { beforeEach, describe, expect, it, vi } from "@effect/vitest"; // Import 'it' from @effect/vitest
import { Cause, Context, Effect, Layer, Option } from "effect";
import { sendEmail } from "../../../src/core/email/effect"; // Adjust path as needed
import { EmailServiceError } from "../../../src/core/email/model"; // Adjust path as needed
import { EmailService } from "../../../src/core/email/services"; // Adjust path as needed

// Define a Vitest mock function for the sendEmail method
const mockSendEmailMethod = vi.fn();

// Create a Test Layer for EmailService
const EmailServiceTest = Layer.succeed(
  EmailService,
  EmailService.of({
    sendEmail: mockSendEmailMethod,
  }),
);

describe("Email Core Effects", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockSendEmailMethod.mockReset();
  });

  describe("sendEmail effect", () => {
    // Use it.effect for Effect-based tests
    it.effect(
      "should call EmailService.sendEmail with correct parameters on success",
      () =>
        Effect.gen(function* (_) {
          // Arrange: mock the service to return success (Effect<void, never>)
          mockSendEmailMethod.mockReturnValue(Effect.succeed(undefined));

          const params = {
            from: "test@example.com",
            to: "user@example.com",
            subject: "Test Subject",
            body: "Test Body",
          };

          // Act: the effect is already being run by it.effect
          yield* _(sendEmail(params));

          // Assert: check if the mocked method was called correctly
          expect(mockSendEmailMethod).toHaveBeenCalledOnce();
          expect(mockSendEmailMethod).toHaveBeenCalledWith(params);
        }).pipe(Effect.provide(EmailServiceTest)),
    );

    it.effect(
      "should return EmailServiceError if the service's sendEmail fails",
      () =>
        Effect.gen(function* (_) {
          // Arrange: mock the service to return a failure
          const originalError = new Error("Network Error");
          mockSendEmailMethod.mockReturnValue(Effect.fail(originalError));

          const params = {
            from: "failure@example.com",
            to: "user@example.com",
            subject: "Failure Subject",
            body: "Failure Body",
          };

          // Act and Assert: use Effect.either to check for failure
          const result = yield* _(Effect.either(sendEmail(params)));

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            const error = result.left as EmailServiceError;
            expect(error).toBeInstanceOf(EmailServiceError);
            expect(error.message).toBe(originalError.message);
            expect(error.cause).toBeUndefined();
          }
          expect(mockSendEmailMethod).toHaveBeenCalledOnce();
          expect(mockSendEmailMethod).toHaveBeenCalledWith(params);
        }).pipe(Effect.provide(EmailServiceTest)),
    );
  });
});
