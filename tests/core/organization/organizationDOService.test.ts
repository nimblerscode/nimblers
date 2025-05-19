import { beforeEach, describe, expect, it, vi } from "@effect/vitest";
import { Effect, Layer } from "effect";
import {
  DOInteractionError,
  OrganizationDONamespace,
  OrganizationProvisionService,
  OrganizationProvisionServiceLive,
  type OrgDOCreationPayload,
} from "../../../src/core/organization/organizationDOService";
import type { OrgCreateData } from "../../../src/core/organization/service";

const mockDurableObjectStubFetch = vi.fn();
const mockIdFromNameFn = vi.fn();
const mockGetFn = vi.fn();

// Define Layers as const using the vi.fn() mocks
const OrganizationDONamespaceTest = Layer.succeed(
  OrganizationDONamespace,
  OrganizationDONamespace.of({
    idFromName: mockIdFromNameFn,
    get: mockGetFn,
  }),
);

const TestOrganizationProvisionServiceLayer = Layer.provide(
  OrganizationProvisionServiceLive,
  OrganizationDONamespaceTest,
);

describe("OrganizationProvisionService", () => {
  beforeEach(() => {
    mockDurableObjectStubFetch.mockReset();
    mockIdFromNameFn.mockReset().mockImplementation((slug) => ({
      toString: () => `mock-do-id-for-${slug}`,
      equals: (other: { toString: () => string }) =>
        other.toString() === `mock-do-id-for-${slug}`,
      name: slug,
    }));
    mockGetFn.mockReset().mockReturnValue({
      fetch: mockDurableObjectStubFetch,
    });
  });

  describe("initializeOrganization", () => {
    const payload: OrgDOCreationPayload = {
      name: "Test DO Org",
      slug: "test-do-org",
      logo: "do-logo.png",
      creatorId: "user-do-creator",
    };

    it.effect(
      "should call DO stub.fetch with correct parameters and return data on success",
      () =>
        Effect.gen(function* (_) {
          const mockExpectedOrgData: OrgCreateData = {
            id: "do-org-id-123",
            name: payload.name,
            slug: payload.slug,
            logo: payload.logo,
            metadata: undefined,
          };
          // Mocking Response.json() requires an async function for await requestArg.json()
          mockDurableObjectStubFetch.mockImplementation(
            async () =>
              new Response(JSON.stringify(mockExpectedOrgData), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }),
          );

          const service = yield* _(OrganizationProvisionService);
          const result = yield* _(service.initializeOrganization(payload));

          expect(result).toEqual(mockExpectedOrgData);
          expect(mockDurableObjectStubFetch).toHaveBeenCalledOnce();
          const requestArg = mockDurableObjectStubFetch.mock
            .calls[0][0] as Request;
          expect(requestArg.method).toBe("POST");
          expect(requestArg.url).toBe("http://internal/organization");
          const body = yield* _(
            Effect.tryPromise(
              () =>
                requestArg.json() as Promise<{
                  organization: { name: string; slug: string };
                  userId: string;
                }>,
            ),
          );
          expect(body.organization.name).toBe(payload.name);
          expect(body.organization.slug).toBe(payload.slug);
          expect(body.userId).toBe(payload.creatorId);
        }).pipe(Effect.provide(TestOrganizationProvisionServiceLayer)),
    );

    it.effect(
      "should return DOInteractionError if DO stub.fetch returns a non-OK response",
      () =>
        Effect.gen(function* (_) {
          const errorResponse = { message: "DO Internal Error" };
          mockDurableObjectStubFetch.mockImplementation(
            async () =>
              new Response(JSON.stringify(errorResponse), {
                status: 500,
                headers: { "Content-Type": "application/json" },
              }),
          );

          const service = yield* _(OrganizationProvisionService);
          const result = yield* _(
            Effect.either(service.initializeOrganization(payload)),
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            const error = result.left as DOInteractionError;
            expect(error).toBeInstanceOf(DOInteractionError);
            expect(error.message).toBe("DO Internal Error");
            expect(error.status).toBe(500);
            expect(error.slug).toBe(payload.slug);
          }
        }).pipe(Effect.provide(TestOrganizationProvisionServiceLayer)),
    );

    it.effect(
      "should return DOInteractionError if DO stub.fetch throws an error (e.g. network issue)",
      () =>
        Effect.gen(function* (_) {
          const networkError = new Error("Network connection failed");
          mockDurableObjectStubFetch.mockRejectedValue(networkError);

          const service = yield* _(OrganizationProvisionService);
          const result = yield* _(
            Effect.either(service.initializeOrganization(payload)),
          );

          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            const error = result.left as DOInteractionError;
            expect(error).toBeInstanceOf(DOInteractionError);
            expect(error.message).toBe(
              "An unexpected error occurred during DO interaction.",
            );
            expect(error.originalError).toBe(networkError);
            expect(error.slug).toBe(payload.slug);
          }
        }).pipe(Effect.provide(TestOrganizationProvisionServiceLayer)),
    );
  });
});
