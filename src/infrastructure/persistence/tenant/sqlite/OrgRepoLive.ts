import { Effect, Layer } from "effect";
import type { Member } from "@/domain/tenant/member/model";
import { MemberRepo } from "@/domain/tenant/member/service";
import {
  type NewOrganization,
  OrgDbError,
} from "@/domain/tenant/organization/model";
import { OrgService } from "@/domain/tenant/organization/service";
import { DrizzleDOClient } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { makeOrgDrizzleAdapter } from "@/infrastructure/persistence/tenant/sqlite/OrgDrizzleAdapter";

const mapToOrgDbError = (error: unknown): OrgDbError => {
  return new OrgDbError({ cause: error });
};
// --- Live Layer ---
export const OrgRepoLive = Layer.effect(
  OrgService,
  Effect.gen(function* () {
    const { db } = yield* DrizzleDOClient;
    // this dep is not needed in the get method, but is needed for the create method
    const memberRepoService = yield* MemberRepo;

    const drizzleAdapter = makeOrgDrizzleAdapter(db);

    return {
      get: (slug: string) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () => drizzleAdapter.getOrgBySlug(slug),
            catch: mapToOrgDbError,
          });

          return { ...result };
        }),
      create: (data: NewOrganization, creatorUserId: string) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () => drizzleAdapter.createOrg(data, creatorUserId),
            catch: mapToOrgDbError,
          });
          // Now, create the initial member
          const createdMemberEffect = memberRepoService.createMember({
            ...result.memberCreateData,
            userId: result.memberCreateData
              .userId as unknown as Member["userId"],
          });

          yield* createdMemberEffect.pipe(Effect.mapError(mapToOrgDbError));
          return result.org;
        }),
    };
  }),
);
