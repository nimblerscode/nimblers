import { describe, it, expect } from "vitest";
import { InviteToken, InviteTokenLive, ErrorToken } from "./tokenUtils";
import { InvitationIdSchema, type InvitationId } from "./models";
import { Context, Effect, Layer, Either, Schema } from "effect";
import type { DurableObjectId } from "@cloudflare/workers-types";

type TokenResult = {
  invitationId: InvitationId;
  doId: DurableObjectId;
};

type TokenPair = {
  token1: string;
  token2: string;
};

describe("Token Utilities", () => {
  const testSecret = "test-secret-key-12345";
  const testInvitationId = Schema.decodeSync(InvitationIdSchema)(
    "93584e3e-67a3-4833-a209-a33201ecdc96"
  );
  const testDoId = "test-do-id" as unknown as DurableObjectId;

  // Create a test environment
  const SecretKey = Context.GenericTag<string>("SECRET_KEY");
  const TestEnv = Layer.succeed(SecretKey, testSecret);
  const MainLayer = Layer.provide(TestEnv, InviteTokenLive);

  describe("sign and verify", () => {
    it("should generate and verify a valid token", async () => {
      const program = Effect.gen(function* ($) {
        const inviteToken = yield* $(InviteToken);
        const token = yield* $(
          inviteToken.sign({
            invitationId: testInvitationId,
            doId: testDoId,
          })
        );

        return yield* $(inviteToken.verify(token));
      });

      const result = await Effect.runPromise(
        Effect.provideLayer(program, MainLayer)
      );

      expect(result.invitationId).toBe(testInvitationId);
      expect(result.doId).toBe(testDoId);
    });

    it("should fail to verify with wrong secret", async () => {
      const WrongEnv = Layer.succeed(SecretKey, "wrong-secret");
      const wrongLayer = Layer.provide(WrongEnv, InviteTokenLive);

      const program = Effect.gen(function* ($) {
        const inviteToken = yield* $(InviteToken);
        const token = yield* $(
          inviteToken.sign({
            invitationId: testInvitationId,
            doId: testDoId,
          })
        );

        return yield* $(Effect.either(inviteToken.verify(token)));
      });

      const result = await Effect.runPromise(
        Effect.provideLayer(program, wrongLayer)
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ErrorToken);
      }
    });

    it("should fail to verify an invalid token format", async () => {
      const program = Effect.gen(function* ($) {
        const inviteToken = yield* $(InviteToken);
        return yield* $(Effect.either(inviteToken.verify("invalid-token")));
      });

      const result = await Effect.runPromise(
        Effect.provideLayer(program, MainLayer)
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ErrorToken);
      }
    });

    it("should generate unique tokens for different data", async () => {
      const program = Effect.gen(function* ($) {
        const inviteToken = yield* $(InviteToken);
        const token1 = yield* $(
          inviteToken.sign({
            invitationId: testInvitationId,
            doId: testDoId,
          })
        );

        const token2 = yield* $(
          inviteToken.sign({
            invitationId: "different-id" as InvitationId,
            doId: "different-do-id" as unknown as DurableObjectId,
          })
        );

        return { token1, token2 };
      });

      const result = await Effect.runPromise(
        Effect.provideLayer(program, MainLayer)
      );

      expect(result.token1).not.toBe(result.token2);
    });

    it("should generate different tokens for same data at different times", async () => {
      const program = Effect.gen(function* ($) {
        const inviteToken = yield* $(InviteToken);
        const token1 = yield* $(
          inviteToken.sign({
            invitationId: testInvitationId,
            doId: testDoId,
          })
        );

        // Add a small delay to ensure different timestamps
        yield* $(
          Effect.promise(
            () => new Promise((resolve) => setTimeout(resolve, 100))
          )
        );

        const token2 = yield* $(
          inviteToken.sign({
            invitationId: testInvitationId,
            doId: testDoId,
          })
        );

        return { token1, token2 };
      });

      const result = await Effect.runPromise(
        Effect.provideLayer(program, MainLayer)
      );

      expect(result.token1).not.toBe(result.token2);
    });
  });
});
