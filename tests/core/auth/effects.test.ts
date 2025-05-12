import { beforeEach, describe, expect, it, vi } from "@effect/vitest";
import type { User as BetterAuthUser, Session } from "better-auth"; // Assuming these types from better-auth
import { Effect, Layer } from "effect";
import {
  handler as authHandlerEffect,
  getSession as getSessionEffect,
} from "../../../src/core/auth/effects"; // Adjust path
import {
  AuthService,
  AuthServiceError,
  UserNotFoundError,
} from "../../../src/core/auth/service"; // Adjust path

// Mocks for AuthService
const mockAuthServiceHandler = vi.fn();
const mockAuthServiceGetSession = vi.fn();

const AuthServiceTest = Layer.succeed(
  AuthService,
  AuthService.of({
    handler: mockAuthServiceHandler,
    getSession: mockAuthServiceGetSession,
  }),
);

describe("Auth Core Effects", () => {
  beforeEach(() => {
    mockAuthServiceHandler.mockReset();
    mockAuthServiceGetSession.mockReset();
  });

  describe("authHandlerEffect", () => {
    it.effect("should call AuthService.handler and return its Response", () =>
      Effect.gen(function* (_) {
        const mockResponse = new Response("Auth OK", { status: 200 });
        // Ensure the mock returns an Effect for handler
        mockAuthServiceHandler.mockReturnValue(Effect.succeed(mockResponse));

        const result = yield* _(authHandlerEffect());

        expect(mockAuthServiceHandler).toHaveBeenCalledOnce();
        expect(result).toBe(mockResponse);
        expect(result.status).toBe(200);
        // Response.text() is async, wrap in Effect.tryPromise
        const text = yield* _(Effect.tryPromise(() => result.text()));
        expect(text).toBe("Auth OK");
      }).pipe(Effect.provide(AuthServiceTest)),
    );

    it.effect(
      "should return AuthServiceError if AuthService.handler fails",
      () =>
        Effect.gen(function* (_) {
          const originalError = new AuthServiceError({
            message: "Handler failed",
          });
          mockAuthServiceHandler.mockReturnValue(Effect.fail(originalError));

          const result = yield* _(Effect.either(authHandlerEffect()));

          expect(mockAuthServiceHandler).toHaveBeenCalledOnce();
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBe(originalError);
          }
        }).pipe(Effect.provide(AuthServiceTest)),
    );
  });

  describe("getSessionEffect", () => {
    it.effect(
      "should call AuthService.getSession and return session data on success",
      () =>
        Effect.gen(function* (_) {
          const mockSessionUser: BetterAuthUser = {
            id: "user-123",
            email: "test@example.com",
            name: "Test User",
            emailVerified: true,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const mockSession: Session = {
            id: "session-xyz",
            userId: "user-123",
            token: "session-token",
            expiresAt: new Date(Date.now() + 3600 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const expectedSessionData = {
            session: mockSession,
            user: mockSessionUser,
          };
          mockAuthServiceGetSession.mockReturnValue(
            Effect.succeed(expectedSessionData),
          );

          const result = yield* _(getSessionEffect());

          expect(mockAuthServiceGetSession).toHaveBeenCalledOnce();
          expect(result).toEqual(expectedSessionData);
        }).pipe(Effect.provide(AuthServiceTest)),
    );

    it.effect(
      "should return correct error if AuthService.getSession fails (e.g. UserNotFoundError)",
      () =>
        Effect.gen(function* (_) {
          const originalError = new UserNotFoundError({
            identifier: "user-not-found",
          });
          mockAuthServiceGetSession.mockReturnValue(Effect.fail(originalError));

          const result = yield* _(Effect.either(getSessionEffect()));

          expect(mockAuthServiceGetSession).toHaveBeenCalledOnce();
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBe(originalError);
          }
        }).pipe(Effect.provide(AuthServiceTest)),
    );
  });
});
