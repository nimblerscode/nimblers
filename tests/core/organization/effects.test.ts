import { beforeEach, describe, expect, it, vi } from "@effect/vitest";
import { Effect, Layer } from "effect";
import {
  type CreateOrgInput,
  create,
  createOrg,
  getOrgById,
  getOrgByUserId,
} from "../../../src/core/organization/effects"; // Adjust path
import type {
  OrgCreateData,
  OrgD1CreateData,
} from "../../../src/core/organization/service"; // Adjust path
import {
  OrgD1Service,
  OrgDbError,
  OrgNotFoundError,
  OrgService,
} from "../../../src/core/organization/service"; // Adjust path

// Mocks for OrgService
const mockCreateOrgMethod = vi.fn();
const mockGetOrgByIdMethod = vi.fn();
const mockGetOrgByUserIdMethod = vi.fn();

const OrgServiceTest = Layer.succeed(
  OrgService,
  OrgService.of({
    createOrg: mockCreateOrgMethod,
    getOrgById: mockGetOrgByIdMethod,
    getOrgByUserId: mockGetOrgByUserIdMethod,
  }),
);

// Mocks for OrgD1Service
const mockInsertOrgToMainDBMethod = vi.fn();

const OrgD1ServiceTest = Layer.succeed(
  OrgD1Service,
  OrgD1Service.of({
    create: mockInsertOrgToMainDBMethod,
  }),
);

const TestLayer = Layer.merge(OrgServiceTest, OrgD1ServiceTest);

describe("Organization Core Effects", () => {
  beforeEach(() => {
    mockCreateOrgMethod.mockReset();
    mockGetOrgByIdMethod.mockReset();
    mockGetOrgByUserIdMethod.mockReset();
    mockInsertOrgToMainDBMethod.mockReset();
  });

  describe("createOrg effect", () => {
    it.effect(
      "should call OrgService.createOrg with correct parameters and return the created organization",
      () =>
        Effect.gen(function* (_) {
          const input: CreateOrgInput = {
            name: "Test Organization",
            slug: "test-org",
            logo: "logo.png",
            userId: "user-123",
          };
          const expectedOrgData: OrgCreateData = {
            id: "org-uuid-123",
            name: input.name,
            slug: input.slug,
            logo: input.logo,
            metadata: undefined,
          };

          mockCreateOrgMethod.mockReturnValue(Effect.succeed(expectedOrgData));

          const result = yield* _(createOrg(input));

          expect(mockCreateOrgMethod).toHaveBeenCalledOnce();
          expect(mockCreateOrgMethod).toHaveBeenCalledWith(
            {
              name: input.name,
              slug: input.slug,
              logo: input.logo,
            },
            input.userId,
          );
          expect(result).toEqual(expectedOrgData);
        }).pipe(Effect.provide(OrgServiceTest)),
    );

    it.effect("should return OrgDbError if OrgService.createOrg fails", () =>
      Effect.gen(function* (_) {
        const input: CreateOrgInput = {
          name: "Error Org",
          slug: "error-org",
          userId: "user-error",
        };
        const originalError = new OrgDbError({ cause: "DB connection failed" });
        mockCreateOrgMethod.mockReturnValue(Effect.fail(originalError));

        const result = yield* _(Effect.either(createOrg(input)));

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBe(originalError);
        }
      }).pipe(Effect.provide(OrgServiceTest)),
    );
  });

  describe("getOrgById effect", () => {
    it.effect(
      "should return organization data if found by OrgService.getOrgById",
      () =>
        Effect.gen(function* (_) {
          const orgId = "org-found-id";
          const expectedOrgData: OrgCreateData = {
            id: orgId,
            name: "Found Org",
            slug: "found-org",
            logo: undefined,
            metadata: undefined,
          };
          mockGetOrgByIdMethod.mockReturnValue(Effect.succeed(expectedOrgData));

          const result = yield* _(getOrgById(orgId));

          expect(mockGetOrgByIdMethod).toHaveBeenCalledWith(orgId);
          expect(result).toEqual(expectedOrgData);
        }).pipe(Effect.provide(OrgServiceTest)),
    );

    it.effect(
      "should return OrgNotFoundError if OrgService.getOrgById fails with it",
      () =>
        Effect.gen(function* (_) {
          const orgId = "org-not-found-id";
          const originalError = new OrgNotFoundError({ orgId });
          mockGetOrgByIdMethod.mockReturnValue(Effect.fail(originalError));

          const result = yield* _(Effect.either(getOrgById(orgId)));
          expect(mockGetOrgByIdMethod).toHaveBeenCalledWith(orgId);
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            const error = result.left as OrgNotFoundError;
            expect(error).toBeInstanceOf(OrgNotFoundError);
            expect(error.orgId).toBe(originalError.orgId);
          }
        }).pipe(Effect.provide(OrgServiceTest)),
    );

    it.effect(
      "should return OrgDbError if OrgService.getOrgById fails with it",
      () =>
        Effect.gen(function* (_) {
          const orgId = "org-db-error-id";
          const originalError = new OrgDbError({ cause: "DB issue" });
          mockGetOrgByIdMethod.mockReturnValue(Effect.fail(originalError));

          const result = yield* _(Effect.either(getOrgById(orgId)));

          expect(mockGetOrgByIdMethod).toHaveBeenCalledWith(orgId);
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            const error = result.left as OrgDbError;
            expect(error).toBeInstanceOf(OrgDbError);
            expect(error.cause).toEqual(originalError.cause);
          }
        }).pipe(Effect.provide(OrgServiceTest)),
    );
  });

  describe("getOrgByUserId effect", () => {
    it.effect(
      "should return organization data if found by OrgService.getOrgByUserId",
      () =>
        Effect.gen(function* (_) {
          const userId = "user-with-org-id";
          const expectedOrgData: OrgCreateData = {
            id: "org-for-user",
            name: "User's Org",
            slug: "user-org",
            logo: undefined,
            metadata: undefined,
          };
          mockGetOrgByUserIdMethod.mockReturnValue(
            Effect.succeed(expectedOrgData),
          );

          const result = yield* _(getOrgByUserId(userId));

          expect(mockGetOrgByUserIdMethod).toHaveBeenCalledWith(userId);
          expect(result).toEqual(expectedOrgData);
        }).pipe(Effect.provide(OrgServiceTest)),
    );

    it.effect(
      "should return OrgNotFoundError if OrgService.getOrgByUserId fails with it",
      () =>
        Effect.gen(function* (_) {
          const userId = "user-not-found-id";
          const originalError = new OrgNotFoundError({
            orgId: "any-org-id-for-error",
          });
          mockGetOrgByUserIdMethod.mockReturnValue(Effect.fail(originalError));

          const result = yield* _(Effect.either(getOrgByUserId(userId)));

          expect(mockGetOrgByUserIdMethod).toHaveBeenCalledWith(userId);
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            const error = result.left as OrgNotFoundError;
            expect(error).toBeInstanceOf(OrgNotFoundError);
            expect(error.orgId).toBe(originalError.orgId);
          }
        }).pipe(Effect.provide(OrgServiceTest)),
    );

    it.effect(
      "should return OrgDbError if OrgService.getOrgByUserId fails with it",
      () =>
        Effect.gen(function* (_) {
          const userId = "user-db-error-id";
          const originalError = new OrgDbError({ cause: "DB issue for user" });
          mockGetOrgByUserIdMethod.mockReturnValue(Effect.fail(originalError));

          const result = yield* _(Effect.either(getOrgByUserId(userId)));

          expect(mockGetOrgByUserIdMethod).toHaveBeenCalledWith(userId);
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            const error = result.left as OrgDbError;
            expect(error).toBeInstanceOf(OrgDbError);
            expect(error.cause).toEqual(originalError.cause);
          }
        }).pipe(Effect.provide(OrgServiceTest)),
    );
  });

  describe("create effect", () => {
    it.effect(
      "should call OrgD1Service.create with correct parameters and return the org data",
      () =>
        Effect.gen(function* (_) {
          const orgToInsert: OrgD1CreateData = {
            id: "d1-org-id-123",
            name: "Org For D1",
            status: "pending",
            creatorId: "user-d1-creator",
          };
          const userId = orgToInsert.creatorId;

          mockInsertOrgToMainDBMethod.mockReturnValue(
            Effect.succeed(orgToInsert),
          );

          const result = yield* _(create(orgToInsert, userId));

          expect(mockInsertOrgToMainDBMethod).toHaveBeenCalledOnce();
          expect(mockInsertOrgToMainDBMethod).toHaveBeenCalledWith(
            orgToInsert,
            userId,
          );
          expect(result).toEqual(orgToInsert);
        }).pipe(Effect.provide(OrgD1ServiceTest)), // Provide the OrgD1ServiceTest Layer
    );

    it.effect(
      "should return OrgDbError if OrgD1Service.create fails",
      () =>
        Effect.gen(function* (_) {
          const orgToInsert: OrgD1CreateData = {
            id: "d1-org-id-error",
            name: "Org D1 Error",
            status: "pending",
            creatorId: "user-d1-error",
          };
          const userId = orgToInsert.creatorId;
          const originalError = new OrgDbError({ cause: "D1 insert failed" });
          mockInsertOrgToMainDBMethod.mockReturnValue(
            Effect.fail(originalError),
          );

          const result = yield* _(Effect.either(create(orgToInsert, userId)));

          expect(mockInsertOrgToMainDBMethod).toHaveBeenCalledOnce();
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            const error = result.left as OrgDbError;
            expect(error).toBeInstanceOf(OrgDbError);
            expect(error.cause).toEqual(originalError.cause);
          }
        }).pipe(Effect.provide(OrgD1ServiceTest)), // Provide the OrgD1ServiceTest Layer
    );
  });
});
