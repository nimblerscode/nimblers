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
            catch: (error) => {
              // Handle OrganizationNotFoundError specifically
              if (error instanceof Error) {
                return new OrgDbError({ cause: error });
              }
              return mapToOrgDbError(error);
            },
          });

          return { ...result };
        }),
      create: (data: NewOrganization, creatorUserId: string) =>
        Effect.gen(function* () {
          yield* Effect.log("=== ORG REPO CREATE START ===").pipe(
            Effect.annotateLogs({
              data: JSON.stringify(data, null, 2),
              creatorUserId,
              timestamp: new Date().toISOString(),
            }),
          );

          yield* Effect.log("Attempting drizzle adapter createOrg");
          const result = yield* Effect.tryPromise({
            try: () => drizzleAdapter.createOrg(data, creatorUserId),
            catch: (error) => {
              return mapToOrgDbError(error);
            },
          });

          yield* Effect.log(
            "drizzleAdapter.createOrg completed successfully",
          ).pipe(
            Effect.annotateLogs({
              result: JSON.stringify(result, null, 2),
              timestamp: new Date().toISOString(),
            }),
          );

          yield* Effect.log("Creating initial member");
          // Now, create the initial member
          const createdMemberEffect = memberRepoService.createMember({
            ...result.memberCreateData,
            userId: result.memberCreateData
              .userId as unknown as Member["userId"],
          });

          yield* createdMemberEffect.pipe(
            Effect.mapError((error) => {
              return mapToOrgDbError(error);
            }),
            Effect.tap(() =>
              Effect.log("Member created successfully").pipe(
                Effect.annotateLogs({
                  timestamp: new Date().toISOString(),
                }),
              ),
            ),
          );

          yield* Effect.log("=== ORG REPO CREATE SUCCESS ===").pipe(
            Effect.annotateLogs({
              finalResult: JSON.stringify(result.org, null, 2),
              timestamp: new Date().toISOString(),
            }),
          );

          return result.org;
        }),
    };
  }),
);
