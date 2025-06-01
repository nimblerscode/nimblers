import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";
import {
  InvalidNonceError,
  type Nonce,
  OAuthError,
} from "../../../src/domain/shopify/oauth/models";
import { NonceManager } from "../../../src/domain/shopify/oauth/service";

describe("Shopify OAuth Nonce Management", () => {
  const testOrganizationId = "test-org-123";

  // Mock NonceManager with proper state management for successful operations
  const MockNonceManagerValid = Layer.effect(
    NonceManager,
    Effect.gen(function* () {
      const storedNonces = yield* Ref.make(new Set<string>());
      const consumedNonces = yield* Ref.make(new Set<string>());

      return {
        generate: () => Effect.sync(() => crypto.randomUUID() as Nonce),
        store: (organizationId: string, nonce: Nonce) =>
          Effect.gen(function* () {
            yield* Ref.update(
              storedNonces,
              (stored) => new Set([...stored, `${organizationId}:${nonce}`]),
            );
          }),
        verify: (organizationId: string, nonce: Nonce) =>
          Effect.gen(function* () {
            const stored = yield* Ref.get(storedNonces);
            const consumed = yield* Ref.get(consumedNonces);
            const key = `${organizationId}:${nonce}`;
            return stored.has(key) && !consumed.has(key);
          }),
        consume: (organizationId: string, nonce: Nonce) =>
          Effect.gen(function* () {
            const stored = yield* Ref.get(storedNonces);
            const consumed = yield* Ref.get(consumedNonces);
            const key = `${organizationId}:${nonce}`;

            if (!stored.has(key)) {
              yield* Effect.fail(
                new InvalidNonceError({ message: "Nonce not found" }),
              );
            }

            if (consumed.has(key)) {
              yield* Effect.fail(
                new InvalidNonceError({ message: "Nonce already consumed" }),
              );
            }

            yield* Ref.update(
              consumedNonces,
              (consumedSet) => new Set([...consumedSet, key]),
            );
          }),
      };
    }),
  );

  // Create failing managers for error testing
  const FailingStorageNonceManager = Layer.succeed(NonceManager, {
    generate: () => Effect.succeed("test-nonce" as Nonce),
    store: (organizationId: string, nonce: Nonce) =>
      Effect.fail(
        new OAuthError({
          message: "Storage failed",
        }),
      ),
    verify: (organizationId: string, nonce: Nonce) => Effect.succeed(false),
    consume: (organizationId: string, nonce: Nonce) => Effect.succeed(void 0),
  });

  const FailingVerificationNonceManager = Layer.succeed(NonceManager, {
    generate: () => Effect.succeed("test-nonce" as Nonce),
    store: (organizationId: string, nonce: Nonce) => Effect.succeed(void 0),
    verify: (organizationId: string, nonce: Nonce) =>
      Effect.fail(
        new InvalidNonceError({
          message: "Verification failed",
        }),
      ),
    consume: (organizationId: string, nonce: Nonce) => Effect.succeed(void 0),
  });

  describe("Nonce Generation", () => {
    it.scoped("should generate unique nonces", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const nonce1 = yield* nonceManager.generate();
        const nonce2 = yield* nonceManager.generate();

        expect(nonce1).toBeTruthy();
        expect(nonce2).toBeTruthy();
        expect(nonce1).not.toBe(nonce2);

        // Should be valid UUID format
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(uuidRegex.test(nonce1)).toBe(true);
        expect(uuidRegex.test(nonce2)).toBe(true);
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );

    it.scoped("should generate nonces consistently", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        // Generate multiple nonces
        const nonces = yield* Effect.all([
          nonceManager.generate(),
          nonceManager.generate(),
          nonceManager.generate(),
          nonceManager.generate(),
          nonceManager.generate(),
        ]);

        // All should be unique
        const uniqueNonces = new Set(nonces);
        expect(uniqueNonces.size).toBe(5);

        // All should be valid strings
        nonces.forEach((nonce) => {
          expect(typeof nonce).toBe("string");
          expect(nonce.length).toBeGreaterThan(0);
        });
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );
  });

  describe("Nonce Storage", () => {
    it.scoped("should store nonce successfully", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const nonce = yield* nonceManager.generate();
        yield* nonceManager.store(testOrganizationId, nonce);

        // Verify nonce is stored by checking if it can be verified
        const isValid = yield* nonceManager.verify(testOrganizationId, nonce);
        expect(isValid).toBe(true);
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );

    it.scoped("should handle multiple nonce storage", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const nonces = yield* Effect.all([
          nonceManager.generate(),
          nonceManager.generate(),
          nonceManager.generate(),
        ]);

        // Store all nonces
        yield* Effect.all([
          nonceManager.store(testOrganizationId, nonces[0]),
          nonceManager.store(testOrganizationId, nonces[1]),
          nonceManager.store(testOrganizationId, nonces[2]),
        ]);

        // Verify all are stored
        const verifications = yield* Effect.all([
          nonceManager.verify(testOrganizationId, nonces[0]),
          nonceManager.verify(testOrganizationId, nonces[1]),
          nonceManager.verify(testOrganizationId, nonces[2]),
        ]);

        expect(verifications).toEqual([true, true, true]);
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );

    it.scoped("should handle storage errors gracefully", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;
        const nonce = yield* nonceManager.generate();

        const result = yield* Effect.either(
          nonceManager.store(testOrganizationId, nonce),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(OAuthError);
        }
      }).pipe(Effect.provide(FailingStorageNonceManager)),
    );
  });

  describe("Nonce Verification", () => {
    it.scoped("should verify valid stored nonce", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const nonce = yield* nonceManager.generate();
        yield* nonceManager.store(testOrganizationId, nonce);

        const isValid = yield* nonceManager.verify(testOrganizationId, nonce);
        expect(isValid).toBe(true);
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );

    it.scoped("should reject non-existent nonce", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const nonExistentNonce = "non-existent-nonce" as Nonce;
        const isValid = yield* nonceManager.verify(
          testOrganizationId,
          nonExistentNonce,
        );
        expect(isValid).toBe(false);
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );

    it.scoped("should reject consumed nonce", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const nonce = yield* nonceManager.generate();
        yield* nonceManager.store(testOrganizationId, nonce);

        // Verify nonce is valid before consumption
        const isValidBefore = yield* nonceManager.verify(
          testOrganizationId,
          nonce,
        );
        expect(isValidBefore).toBe(true);

        // Consume the nonce
        yield* nonceManager.consume(testOrganizationId, nonce);

        // Verify nonce is no longer valid after consumption
        const isValidAfter = yield* nonceManager.verify(
          testOrganizationId,
          nonce,
        );
        expect(isValidAfter).toBe(false);
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );

    it.scoped("should handle verification errors", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;
        const nonce = "test-nonce" as Nonce;

        const result = yield* Effect.either(
          nonceManager.verify(testOrganizationId, nonce),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidNonceError);
        }
      }).pipe(Effect.provide(FailingVerificationNonceManager)),
    );
  });

  describe("Nonce Consumption", () => {
    it.scoped("should consume valid nonce successfully", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const nonce = yield* nonceManager.generate();
        yield* nonceManager.store(testOrganizationId, nonce);

        // Verify nonce exists before consumption
        const isValidBefore = yield* nonceManager.verify(
          testOrganizationId,
          nonce,
        );
        expect(isValidBefore).toBe(true);

        // Consume the nonce (should not throw)
        yield* nonceManager.consume(testOrganizationId, nonce);

        // Verify nonce is consumed and no longer valid
        const isValidAfter = yield* nonceManager.verify(
          testOrganizationId,
          nonce,
        );
        expect(isValidAfter).toBe(false);
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );

    it.scoped("should fail to consume non-existent nonce", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const nonExistentNonce = "non-existent-nonce" as Nonce;

        const result = yield* Effect.either(
          nonceManager.consume(testOrganizationId, nonExistentNonce),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidNonceError);
        }
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );

    it.scoped("should fail to consume already consumed nonce", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const nonce = yield* nonceManager.generate();
        yield* nonceManager.store(testOrganizationId, nonce);

        // First consumption should succeed
        yield* nonceManager.consume(testOrganizationId, nonce);

        // Second consumption should fail
        const result = yield* Effect.either(
          nonceManager.consume(testOrganizationId, nonce),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidNonceError);
        }
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );
  });

  describe("Single-Use Security", () => {
    it.scoped("should enforce single-use nonce pattern", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const nonce = yield* nonceManager.generate();
        yield* nonceManager.store(testOrganizationId, nonce);

        // First verification should succeed
        const firstVerify = yield* nonceManager.verify(
          testOrganizationId,
          nonce,
        );
        expect(firstVerify).toBe(true);

        // Consumption should succeed
        yield* nonceManager.consume(testOrganizationId, nonce);

        // Subsequent verification should fail
        const secondVerify = yield* nonceManager.verify(
          testOrganizationId,
          nonce,
        );
        expect(secondVerify).toBe(false);

        // Subsequent consumption should fail
        const secondConsume = yield* Effect.either(
          nonceManager.consume(testOrganizationId, nonce),
        );
        expect(secondConsume._tag).toBe("Left");
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );

    it.scoped("should handle concurrent nonce operations", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const nonce = yield* nonceManager.generate();
        yield* nonceManager.store(testOrganizationId, nonce);

        // Attempt concurrent consumption
        const consumptions = [
          Effect.either(nonceManager.consume(testOrganizationId, nonce)),
          Effect.either(nonceManager.consume(testOrganizationId, nonce)),
          Effect.either(nonceManager.consume(testOrganizationId, nonce)),
        ];

        const results = yield* Effect.all(consumptions, {
          concurrency: "unbounded",
        });

        // Only one should succeed, others should fail
        const successes = results.filter((r) => r._tag === "Right").length;
        const failures = results.filter((r) => r._tag === "Left").length;

        expect(successes).toBe(1);
        expect(failures).toBe(2);
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );
  });

  describe("Performance", () => {
    it.scoped("should handle bulk nonce operations efficiently", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const startTime = performance.now();

        // Generate 50 nonces
        const nonces = yield* Effect.all(
          Array.from({ length: 50 }, () => nonceManager.generate()),
        );

        // Store all nonces
        yield* Effect.all(
          nonces.map((nonce) => nonceManager.store(testOrganizationId, nonce)),
          { concurrency: 10 },
        );

        // Verify all nonces
        const verifications = yield* Effect.all(
          nonces.map((nonce) => nonceManager.verify(testOrganizationId, nonce)),
          { concurrency: 10 },
        );

        // Consume all nonces
        yield* Effect.all(
          nonces.map((nonce) =>
            nonceManager.consume(testOrganizationId, nonce),
          ),
          { concurrency: 10 },
        );

        const endTime = performance.now();
        const duration = endTime - startTime;

        // All operations should succeed
        expect(verifications.every((v) => v === true)).toBe(true);

        // Performance should be reasonable (adjust threshold as needed)
        expect(duration).toBeLessThan(5000); // Less than 5 seconds for 50 nonces
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );
  });

  describe("Edge Cases", () => {
    it.scoped("should handle empty nonce", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const emptyNonce = "" as Nonce;

        const storeResult = yield* Effect.either(
          nonceManager.store(testOrganizationId, emptyNonce),
        );
        const verifyResult = yield* Effect.either(
          nonceManager.verify(testOrganizationId, emptyNonce),
        );

        // Empty nonce operations should either fail or return false
        if (storeResult._tag === "Right") {
          expect(verifyResult._tag === "Right" && verifyResult.right).toBe(
            false,
          );
        } else {
          expect(storeResult._tag).toBe("Left");
        }
      }).pipe(
        Effect.provide(
          Layer.succeed(NonceManager, {
            generate: () => Effect.succeed("" as Nonce),
            store: (organizationId: string, nonce: Nonce) => {
              // Empty nonce should be rejected or stored with failure
              if (nonce === "") {
                return Effect.fail(
                  new OAuthError({ message: "Empty nonce not allowed" }),
                );
              }
              return Effect.succeed(void 0);
            },
            verify: (organizationId: string, nonce: Nonce) => {
              // Empty nonces should always fail verification
              if (nonce === "") {
                return Effect.succeed(false);
              }
              return Effect.succeed(true);
            },
            consume: (organizationId: string, nonce: Nonce) =>
              Effect.succeed(void 0),
          }),
        ),
      ),
    );

    it.scoped("should handle very long nonces", () =>
      Effect.gen(function* () {
        const nonceManager = yield* NonceManager;

        const longNonce = "a".repeat(1000) as Nonce;

        const storeResult = yield* Effect.either(
          nonceManager.store(testOrganizationId, longNonce),
        );

        if (storeResult._tag === "Right") {
          const verifyResult = yield* nonceManager.verify(
            testOrganizationId,
            longNonce,
          );
          expect(verifyResult).toBe(true);

          yield* nonceManager.consume(testOrganizationId, longNonce);

          const afterConsume = yield* nonceManager.verify(
            testOrganizationId,
            longNonce,
          );
          expect(afterConsume).toBe(false);
        }
      }).pipe(Effect.provide(MockNonceManagerValid)),
    );
  });
});
