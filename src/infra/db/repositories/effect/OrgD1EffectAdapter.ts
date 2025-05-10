import { OrganizationD1Schema } from "@/core/organization/model";
import { type OrgD1CreateData, OrgDbError } from "@/core/organization/service";
import { Effect, pipe } from "effect";
import { Schema as S } from "effect";
import type { schema } from "../../drizzle/drizzleDO";
import type { makeOrgD1DrizzleAdapter } from "../adapters/OrgD1DrizzleAdapter";

type Organization = typeof schema.organization.$inferSelect;

const mapToOrgDbError = (error: unknown): OrgDbError => {
  console.error("Organization Repository DB Error:", error);
  return new OrgDbError({ cause: error });
};

const decodeOrg = (organization: OrgD1CreateData) => {
  const dataToDecode = {
    ...organization,
    metadata: undefined,
  };
  return pipe(
    S.decodeUnknown(OrganizationD1Schema)(dataToDecode),
    Effect.mapBoth({
      onFailure: (decodeError) => {
        console.error("Organization Decode Error D1:", decodeError);
        return mapToOrgDbError(decodeError);
      },
      onSuccess: (decodedData: OrgD1CreateData) => decodedData,
    }),
  );
};

export const makeOrgD1EffectAdapter = (
  drizzleAdapter: ReturnType<typeof makeOrgD1DrizzleAdapter>,
) => ({
  insertOrgToMainDB: (
    org: Pick<OrgD1CreateData, "id" | "name">,
    creatorUserId: string,
  ) =>
    Effect.gen(function* (_) {
      const orgResult = yield* _(
        Effect.tryPromise({
          try: () => drizzleAdapter.insertOrgToMainDB(org, creatorUserId),
          catch: mapToOrgDbError,
        }),
      );
      if (!orgResult) {
        return yield* _(
          Effect.fail(mapToOrgDbError("Insert returned no results")),
        );
      }
      return yield* _(decodeOrg(orgResult));
    }),
});
