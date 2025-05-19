import { Effect } from "effect";
import {
  type NewOrganizationD1,
  OrgDbError,
} from "@/domain/global/organization/model";
import type { makeOrgD1DrizzleAdapter } from "./OrgD1DrizzleAdapter";

const mapToOrgDbError = (error: unknown): OrgDbError => {
  console.error("Organization Repository DB Error:", error);
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
});
