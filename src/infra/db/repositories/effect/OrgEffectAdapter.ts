import type { MemberRepo } from "@/core/member/service";
import { OrganizationSchema } from "@/core/organization/model";
import {
  type OrgCreateData,
  OrgDbError,
  OrgNotFoundError,
} from "@/core/organization/service";
import { Effect, pipe } from "effect";
import { Schema as S } from "effect";
import type { schema } from "../../drizzle/drizzleDO";
import type { makeOrgDrizzleAdapter } from "../adapters/OrgDrizzleAdapter";

type Organization = typeof schema.organization.$inferSelect;
type Member = typeof schema.member.$inferSelect;

const mapToOrgDbError = (error: unknown): OrgDbError => {
  console.error("Organization Repository DB Error:", error);
  return new OrgDbError({ cause: error });
};

const decodeOrg = (organization: Organization) => {
  const dataToDecode = {
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
      onSuccess: (decodedData): OrgCreateData => decodedData,
    }),
  );
};

export const makeOrgEffectAdapter = (
  drizzleAdapter: ReturnType<typeof makeOrgDrizzleAdapter>,
  memberRepo: MemberRepo["Type"],
) => ({
  createOrg: (
    data: Pick<OrgCreateData, "name" | "slug" | "logo">,
    creatorUserId: string,
  ) =>
    Effect.gen(function* (_) {
      const result = yield* _(
        Effect.tryPromise({
          try: () => drizzleAdapter.createOrg(data, creatorUserId),
          catch: mapToOrgDbError,
        }),
      );
      if (!result) {
        return yield* _(
          Effect.fail(mapToOrgDbError("Insert returned no results")),
        );
      }
      const organization = yield* _(decodeOrg(result.org)).pipe(
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
      yield* _(createdMemberEffect, Effect.mapError(mapToOrgDbError));
      return organization;
    }),
  getOrgById: (id: string) =>
    Effect.gen(function* (_) {
      const org = yield* _(
        Effect.tryPromise({
          try: () => drizzleAdapter.getOrgById(id),
          catch: mapToOrgDbError,
        }),
      );
      if (!org) {
        return yield* _(Effect.fail(new OrgNotFoundError({ orgId: id })));
      }
      return yield* _(
        decodeOrg(org).pipe(
          Effect.mapError((e) => {
            console.error("Organization Decode DO Error:", e);
            return mapToOrgDbError(e);
          }),
        ),
      );
    }),
  getOrgByUserId: (userId: string) =>
    Effect.gen(function* (_) {
      const org = yield* _(
        Effect.tryPromise({
          try: () => drizzleAdapter.getOrgByUserId(userId),
          catch: mapToOrgDbError,
        }),
      );
      if (!org) {
        return yield* _(Effect.fail(new OrgNotFoundError({ orgId: userId })));
      }
      return yield* _(
        decodeOrg(org).pipe(
          Effect.mapError((e) => {
            console.error("Organization Decode DO Error:", e);
            return mapToOrgDbError(e);
          }),
        ),
      );
    }),
});
