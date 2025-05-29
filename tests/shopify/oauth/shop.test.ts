import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import {
  InvalidShopDomainError,
  type ShopDomain,
} from "../../../src/domain/global/shopify/oauth/models";
import { ShopValidator } from "../../../src/domain/global/shopify/oauth/service";
import { ShopValidatorLive } from "../../../src/infrastructure/shopify/oauth/shop";

describe("Shopify Shop Validation", () => {
  describe("Valid Shop Domains", () => {
    it.scoped("should validate basic shop domain", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* shopValidator.validateShopDomain(
          "test-shop.myshopify.com",
        );
        expect(result).toBe("test-shop.myshopify.com");
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should validate shop domain with numbers", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* shopValidator.validateShopDomain(
          "shop123.myshopify.com",
        );
        expect(result).toBe("shop123.myshopify.com");
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should validate shop domain with hyphens", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* shopValidator.validateShopDomain(
          "my-test-shop.myshopify.com",
        );
        expect(result).toBe("my-test-shop.myshopify.com");
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should validate single character shop name", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result =
          yield* shopValidator.validateShopDomain("a.myshopify.com");
        expect(result).toBe("a.myshopify.com");
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should validate shop domain starting with number", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* shopValidator.validateShopDomain(
          "123shop.myshopify.com",
        );
        expect(result).toBe("123shop.myshopify.com");
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should validate long shop domain", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const longShop =
          "a-very-long-shop-name-with-many-hyphens-and-characters.myshopify.com";
        const result = yield* shopValidator.validateShopDomain(longShop);
        expect(result).toBe(longShop);
      }).pipe(Effect.provide(ShopValidatorLive)),
    );
  });

  describe("Invalid Shop Domains", () => {
    it.scoped("should reject domain without .myshopify.com", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain("test-shop.com"),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
          expect(result.left.message).toContain("must end with .myshopify.com");
          expect(result.left.shop).toBe("test-shop.com");
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should reject plain myshopify.com", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain("myshopify.com"),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should reject domain starting with dot", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain(".myshopify.com"),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should reject domain starting with hyphen", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain("-test.myshopify.com"),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should reject domain with spaces", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain("test shop.myshopify.com"),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should reject empty string", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain(""),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
          expect(result.left.message).toContain("must end with .myshopify.com");
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should reject wrong TLD", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain("test-shop.myshopify.co"),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
          expect(result.left.message).toContain("must end with .myshopify.com");
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should reject shopify.com (not myshopify.com)", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain("test-shop.shopify.com"),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
          expect(result.left.message).toContain("must end with .myshopify.com");
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should reject domain with protocol", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain("https://test-shop.myshopify.com"),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should reject domain with path", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain("test-shop.myshopify.com/admin"),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should reject subdomain attack", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain("test-shop.myshopify.com.evil.com"),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
          expect(result.left.message).toContain("must end with .myshopify.com");
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );
  });

  describe("Security Tests", () => {
    it.scoped("should reject domain injection attempts", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const maliciousDomains = [
          "test-shop.myshopify.com.attacker.com",
          "evil.com/test-shop.myshopify.com",
          "test-shop.myshopify.com#attacker.com",
          "test-shop.myshopify.com?redirect=attacker.com",
        ];

        for (const domain of maliciousDomains) {
          const result = yield* Effect.either(
            shopValidator.validateShopDomain(domain),
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(InvalidShopDomainError);
          }
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should handle special characters correctly", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const invalidDomains = [
          "test_shop.myshopify.com", // underscore not allowed
          "test.shop.myshopify.com", // dots not allowed in shop name
          "test@shop.myshopify.com", // @ not allowed
          "test+shop.myshopify.com", // + not allowed
          "test%20shop.myshopify.com", // URL encoded space
        ];

        for (const domain of invalidDomains) {
          const result = yield* Effect.either(
            shopValidator.validateShopDomain(domain),
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(InvalidShopDomainError);
          }
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );
  });

  describe("Edge Cases", () => {
    it.scoped("should handle unicode characters", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain("tëst-shöp.myshopify.com"),
        );

        // Unicode characters should be rejected by the pattern
        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(InvalidShopDomainError);
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should handle very long shop names", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        // Create a very long but valid shop name
        const longShopName = "a".repeat(100) + ".myshopify.com";

        const result = yield* shopValidator.validateShopDomain(longShopName);
        expect(result).toBe(longShopName);
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should handle case sensitivity", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        // Shopify domains should be case-insensitive but preserved
        const mixedCase = "Test-Shop.myshopify.com";
        const result = yield* shopValidator.validateShopDomain(mixedCase);
        expect(result).toBe(mixedCase);
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should handle domain with consecutive hyphens", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* shopValidator.validateShopDomain(
          "test--shop.myshopify.com",
        );
        expect(result).toBe("test--shop.myshopify.com");
      }).pipe(Effect.provide(ShopValidatorLive)),
    );
  });

  describe("Type Safety", () => {
    it.scoped("should return branded ShopDomain type", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* shopValidator.validateShopDomain(
          "test-shop.myshopify.com",
        );

        // This should be a branded ShopDomain type
        const shopDomain: ShopDomain = result;
        const stringValue: string = result; // Should also be assignable to string

        expect(shopDomain).toBe("test-shop.myshopify.com");
        expect(stringValue).toBe("test-shop.myshopify.com");
      }).pipe(Effect.provide(ShopValidatorLive)),
    );
  });

  describe("Error Messages", () => {
    it.scoped("should provide descriptive error for wrong suffix", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain("test-shop.com"),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left.message).toBe(
            "Shop domain must end with .myshopify.com",
          );
          expect(result.left.shop).toBe("test-shop.com");
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should provide descriptive error for invalid format", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const result = yield* Effect.either(
          shopValidator.validateShopDomain("invalid_shop.myshopify.com"),
        );

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left.message).toBe("Invalid shop domain format");
          expect(result.left.shop).toBe("invalid_shop.myshopify.com");
        }
      }).pipe(Effect.provide(ShopValidatorLive)),
    );
  });

  describe("Performance", () => {
    it.scoped("should validate multiple domains concurrently", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const domains = [
          "shop1.myshopify.com",
          "shop2.myshopify.com",
          "shop3.myshopify.com",
          "shop4.myshopify.com",
          "shop5.myshopify.com",
        ];

        const validationTasks = domains.map((domain) =>
          shopValidator.validateShopDomain(domain),
        );

        const results = yield* Effect.all(validationTasks, {
          concurrency: "unbounded",
        });

        expect(results).toEqual(domains);
      }).pipe(Effect.provide(ShopValidatorLive)),
    );

    it.scoped("should handle mixed valid and invalid domains", () =>
      Effect.gen(function* () {
        const shopValidator = yield* ShopValidator;

        const domains = [
          "valid1.myshopify.com",
          "invalid.com",
          "valid2.myshopify.com",
          "also-invalid.shopify.com",
        ];

        const validationTasks = domains.map((domain) =>
          Effect.either(shopValidator.validateShopDomain(domain)),
        );

        const results = yield* Effect.all(validationTasks, {
          concurrency: "unbounded",
        });

        expect(results[0]._tag).toBe("Right");
        expect(results[1]._tag).toBe("Left");
        expect(results[2]._tag).toBe("Right");
        expect(results[3]._tag).toBe("Left");
      }).pipe(Effect.provide(ShopValidatorLive)),
    );
  });
});
