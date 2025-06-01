import { Effect } from "effect";
import type {
  NewOrganizationD1,
  OrganizationWithMembership,
} from "@/domain/global/organization/model";
import { OrgDbError } from "@/domain/global/organization/model";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { makeOrgD1DrizzleAdapter } from "./OrgD1DrizzleAdapter";
import type { UserId } from "@/domain/global/user/model";

const mapToOrgDbError = (error: unknown): OrgDbError => {
  return new OrgDbError({ cause: error });
};

export const makeOrgD1EffectAdapter = (
  drizzleAdapter: ReturnType<typeof makeOrgD1DrizzleAdapter>
) => ({
  create: (organizationData: NewOrganizationD1) =>
    Effect.gen(function* () {
      const orgResult = yield* Effect.tryPromise({
        try: () => drizzleAdapter.create(organizationData),
        catch: mapToOrgDbError,
      });
      if (!orgResult) {
        return yield* Effect.fail(
          mapToOrgDbError("Insert returned no results")
        );
      }
      return orgResult;
    }),
  getOrgById: (id: string) =>
    Effect.gen(function* () {
      const orgResult = yield* Effect.tryPromise({
        try: () => drizzleAdapter.getOrgById(id),
        catch: mapToOrgDbError,
      });
      if (!orgResult) {
        return yield* Effect.fail(mapToOrgDbError("Get returned no results"));
      }
      return orgResult;
    }),
  getOrgBySlug: (slug: OrganizationSlug) =>
    Effect.gen(function* () {
      const orgResult = yield* Effect.tryPromise({
        try: () => drizzleAdapter.getOrgBySlug(slug),
        catch: mapToOrgDbError,
      });
      if (!orgResult) {
        return yield* Effect.fail(mapToOrgDbError("Get returned no results"));
      }
      return orgResult;
    }),
  verifyUserOrgMembership: (slug: OrganizationSlug, userId: UserId) => {
    return Effect.gen(function* () {
      const orgSlug = yield* Effect.tryPromise({
        try: () => drizzleAdapter.verifyUserOrgMembership(slug, userId),
        catch: (e) => {
          return mapToOrgDbError(e);
        },
      });
      if (!orgSlug) {
        return yield* Effect.fail(mapToOrgDbError("Get returned no results"));
      }
      return orgSlug;
    });
  },
  getOrganizationsForUser: (
    userId: UserId
  ): Effect.Effect<OrganizationWithMembership[], OrgDbError> =>
    Effect.gen(function* () {
      const organizations = yield* Effect.tryPromise({
        try: () => drizzleAdapter.getOrganizationsForUser(userId),
        catch: mapToOrgDbError,
      });
      return organizations;
    }),
});
