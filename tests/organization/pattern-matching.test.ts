import { describe, expect, it } from "@effect/vitest";
import { Effect, Match } from "effect";

describe("Pattern Matching in Organization Client", () => {
  // Test the pattern matching logic that we use in the client
  const patternMatchURL = (input: RequestInfo | URL): string => {
    return Match.value(input).pipe(
      Match.when(Match.string, (str) => str),
      Match.when(
        (input): input is URL => input instanceof URL,
        (url) => url.toString(),
      ),
      Match.when(
        (input): input is Request => input instanceof Request,
        (request) => request.url,
      ),
      Match.exhaustive, // Ensures all cases are handled at compile time
    );
  };

  describe("URL Pattern Matching", () => {
    it("should handle string URLs correctly", () => {
      const stringUrl = "http://example.com/organization/test-org";
      const result = patternMatchURL(stringUrl);

      expect(result).toBe(stringUrl);
      expect(typeof result).toBe("string");
    });

    it("should handle URL objects correctly", () => {
      const urlObject = new URL("http://example.com/organization/test-org");
      const result = patternMatchURL(urlObject);

      expect(result).toBe("http://example.com/organization/test-org");
      expect(typeof result).toBe("string");
    });

    it("should handle Request objects correctly", () => {
      const requestObject = new Request(
        "http://example.com/organization/test-org",
      );
      const result = patternMatchURL(requestObject);

      expect(result).toBe("http://example.com/organization/test-org");
      expect(typeof result).toBe("string");
    });

    it("should handle URLs with query parameters", () => {
      const urlWithQuery =
        "http://example.com/organization/test-org?param=value&other=test";
      const result = patternMatchURL(urlWithQuery);

      expect(result).toBe(urlWithQuery);
    });

    it("should handle URLs with fragments", () => {
      const urlObject = new URL(
        "http://example.com/organization/test-org#section",
      );
      const result = patternMatchURL(urlObject);

      expect(result).toBe("http://example.com/organization/test-org#section");
    });

    it("should handle complex URLs with encoding", () => {
      const complexUrl =
        "http://example.com/organization/test%20org?param=value%26encoded";
      const result = patternMatchURL(complexUrl);

      expect(result).toBe(complexUrl);
    });
  });

  describe("URL Transformation Logic", () => {
    // Test the URL transformation logic used in the DO client
    const transformUrlForDO = (input: RequestInfo | URL): string => {
      const url = patternMatchURL(input);
      const parsedUrl = new URL(url);
      return `http://internal${parsedUrl.pathname}${parsedUrl.search}`;
    };

    it("should transform string URLs to internal format", () => {
      const originalUrl = "http://external.com/organization/test-org";
      const transformed = transformUrlForDO(originalUrl);

      expect(transformed).toBe("http://internal/organization/test-org");
    });

    it("should transform URL objects to internal format", () => {
      const urlObject = new URL(
        "http://external.com/organization/test-org?param=value",
      );
      const transformed = transformUrlForDO(urlObject);

      expect(transformed).toBe(
        "http://internal/organization/test-org?param=value",
      );
    });

    it("should transform Request objects to internal format", () => {
      const requestObject = new Request(
        "http://external.com/organization/test-org/members",
      );
      const transformed = transformUrlForDO(requestObject);

      expect(transformed).toBe("http://internal/organization/test-org/members");
    });

    it("should preserve query parameters in transformation", () => {
      const urlWithQuery =
        "http://external.com/organization/test-org?filter=active&sort=name";
      const transformed = transformUrlForDO(urlWithQuery);

      expect(transformed).toBe(
        "http://internal/organization/test-org?filter=active&sort=name",
      );
    });

    it("should handle root paths correctly", () => {
      const rootUrl = "http://external.com/";
      const transformed = transformUrlForDO(rootUrl);

      expect(transformed).toBe("http://internal/");
    });
  });

  describe("Pattern Matching Performance", () => {
    it("should handle pattern matching efficiently", () => {
      const testInputs = [
        "http://test.com/org1",
        new URL("http://test.com/org2"),
        new Request("http://test.com/org3"),
        "http://test.com/org4",
        new URL("http://test.com/org5"),
      ];

      const startTime = performance.now();

      for (const input of testInputs) {
        const result = patternMatchURL(input);
        expect(typeof result).toBe("string");
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Pattern matching should be fast
      expect(duration).toBeLessThan(50); // Less than 50ms for 5 operations
    });

    it("should handle multiple concurrent pattern matching operations", async () => {
      const testInputs = Array.from({ length: 100 }, (_, i) => [
        `http://test.com/org${i}`,
        new URL(`http://test.com/url${i}`),
        new Request(`http://test.com/req${i}`),
      ]).flat();

      const promises = testInputs.map(async (input) => {
        return patternMatchURL(input);
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(300);
      results.forEach((result) => {
        expect(typeof result).toBe("string");
        expect(result).toContain("http://test.com/");
      });
    });
  });

  describe("Type Safety and Exhaustiveness", () => {
    it("should demonstrate compile-time exhaustiveness checking", () => {
      // This test ensures that Match.exhaustive catches any unhandled cases
      const testPatternMatch = (input: RequestInfo | URL) => {
        return Match.value(input).pipe(
          Match.when(Match.string, (str) => `string: ${str}`),
          Match.when(
            (input): input is URL => input instanceof URL,
            (url) => `url: ${url.toString()}`,
          ),
          Match.when(
            (input): input is Request => input instanceof Request,
            (request) => `request: ${request.url}`,
          ),
          Match.exhaustive, // This ensures TypeScript validates all cases are covered
        );
      };

      expect(testPatternMatch("http://test.com")).toContain("string:");
      expect(testPatternMatch(new URL("http://test.com"))).toContain("url:");
      expect(testPatternMatch(new Request("http://test.com"))).toContain(
        "request:",
      );
    });

    it("should handle edge cases gracefully", () => {
      // Test with minimal URL
      const minimalUrl = "http://a.com/";
      expect(patternMatchURL(minimalUrl)).toBe(minimalUrl);

      // Test with complex URL
      const complexUrl = new URL(
        "https://example.com:8080/path/to/resource?query=value&another=test#fragment",
      );
      const result = patternMatchURL(complexUrl);
      expect(result).toContain("https://example.com:8080/path/to/resource");
      expect(result).toContain("query=value");
    });
  });

  describe("Integration with Effect Patterns", () => {
    it.scoped("should work within Effect.gen context", () =>
      Effect.gen(function* () {
        const input = "http://example.com/organization/test-org";

        const processUrl = (url: string) =>
          Effect.sync(() => {
            const matched = patternMatchURL(url);
            const parsed = new URL(matched);
            return `http://internal${parsed.pathname}${parsed.search}`;
          });

        const result = yield* processUrl(input);
        expect(result).toBe("http://internal/organization/test-org");
      }),
    );

    it.scoped("should handle error cases in Effect context", () =>
      Effect.gen(function* () {
        const processUrlSafely = (input: string) =>
          Effect.gen(function* () {
            try {
              const matched = patternMatchURL(input);
              const parsed = new URL(matched);
              return `http://internal${parsed.pathname}${parsed.search}`;
            } catch (error) {
              return yield* Effect.fail(new Error(`Invalid URL: ${input}`));
            }
          });

        // Valid URL should succeed
        const validResult = yield* processUrlSafely("http://example.com/test");
        expect(validResult).toBe("http://internal/test");

        // Invalid URL should be handled gracefully in Effect context
        const invalidResult = yield* Effect.either(
          processUrlSafely("not-a-url"),
        );
        expect(invalidResult._tag).toBe("Left");
      }),
    );
  });

  describe("Benefits of Pattern Matching Approach", () => {
    it("should demonstrate type safety benefits", () => {
      // Before pattern matching, we might have used if/else chains:
      const oldApproach = (input: RequestInfo | URL): string => {
        if (typeof input === "string") {
          return input;
        }
        if (input instanceof URL) {
          return input.toString();
        }
        if (input instanceof Request) {
          return input.url;
        }
        // This case might be missed without exhaustive checking
        throw new Error("Unhandled input type");
      };

      // Pattern matching provides compile-time exhaustiveness checking
      const newApproach = patternMatchURL;

      // Both should work the same for valid inputs
      const testInputs: (RequestInfo | URL)[] = [
        "http://test.com",
        new URL("http://test.com"),
        new Request("http://test.com"),
      ];

      testInputs.forEach((input) => {
        expect(oldApproach(input)).toBe(newApproach(input));
      });
    });

    it("should demonstrate functional programming benefits", () => {
      // Pattern matching encourages immutable, functional style
      const testInputs = [
        "http://test1.com",
        new URL("http://test2.com"),
        new Request("http://test3.com"),
      ];

      // Can be easily mapped over arrays
      const results = testInputs.map(patternMatchURL);

      expect(results).toEqual([
        "http://test1.com",
        "http://test2.com/",
        "http://test3.com/",
      ]);

      // Results are predictable and side-effect free
      const firstResult = patternMatchURL(testInputs[0]);
      const secondResult = patternMatchURL(testInputs[0]);
      expect(firstResult).toBe(secondResult);
    });
  });
});
