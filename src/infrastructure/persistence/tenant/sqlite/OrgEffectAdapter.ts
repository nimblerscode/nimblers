import type { MemberRepo } from "@/domain/tenant/member/service";
import {
  type NewOrganization,
  type Organization,
  OrganizationSchema,
} from "@/domain/tenant/organization/model";
import { OrgDbError } from "@/domain/tenant/organization/model";
import type { makeOrgDrizzleAdapter } from "@/infrastructure/persistence/tenant/sqlite/OrgDrizzleAdapter";
import { Effect, Schema as S, pipe } from "effect";

const mapToOrgDbError = (error: unknown): OrgDbError => {
  console.error("Organization Repository DB Error:", error);
  return new OrgDbError({ cause: error });
};

const decodeOrg = (organization: Organization) => {
  const dataToDecode: Organization = {
    ...organization,
    logo: organization.logo ?? undefined,
    metadata: undefined,
  };
  return pipe(
    S.decode(OrganizationSchema)(dataToDecode),
    Effect.mapBoth({
      onFailure: (decodeError) => {
        console.error("Organization Decode DO Error:", decodeError);
        return mapToOrgDbError(decodeError);
      },
      onSuccess: (decodedData) => decodedData,
    }),
  );
};

export const makeOrgEffectAdapter = (
  drizzleAdapter: ReturnType<typeof makeOrgDrizzleAdapter>,
  memberRepo: MemberRepo["Type"],
) => ({
  createOrg: (data: NewOrganization, creatorUserId: string) =>
    Effect.gen(function* () {
      const result = yield* Effect.tryPromise({
        try: () => drizzleAdapter.createOrg(data, creatorUserId),
        catch: mapToOrgDbError,
      });
      if (!result) {
        return yield* Effect.fail(
          mapToOrgDbError("Insert returned no results"),
        );
      }
      const organization = yield* decodeOrg(result.org).pipe(
        Effect.mapError((e) => {
          console.log(result.org);
          console.error("Organization Decode DO Error:", e);
          return mapToOrgDbError(e);
        }),
      );

      // Now, create the initial member
      const createdMemberEffect = memberRepo.createMember(
        result.memberCreateData,
      );
      yield* createdMemberEffect.pipe(Effect.mapError(mapToOrgDbError));
      return organization;
    }),
});
