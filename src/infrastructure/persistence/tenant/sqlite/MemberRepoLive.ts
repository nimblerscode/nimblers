import { eq } from "drizzle-orm";
import { Effect, Layer, Option, Schema as S } from "effect";
import { v4 as uuidv4 } from "uuid";
import {
  type Member,
  MemberDbError,
  type NewMember,
  NewMemberSchema,
} from "@/domain/tenant/member/model";
import { MemberRepo } from "@/domain/tenant/member/service";
import { DrizzleDOClient } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { member as memberTable } from "@/infrastructure/persistence/tenant/sqlite/schema";

export const MemberRepoLive = Layer.effect(
  MemberRepo,
  Effect.gen(function* () {
    const { db } = yield* DrizzleDOClient;

    return {
      createMember: (data: NewMember) => {
        const effectLogic: Effect.Effect<Member, MemberDbError, never> =
          Effect.gen(function* () {
            const memberId = uuidv4();
            const memberToInsert = {
              ...data,
              id: memberId,
            };

            // Validate input data
            yield* S.decodeUnknown(NewMemberSchema)(data).pipe(
              Effect.mapError(
                (e) =>
                  new MemberDbError({
                    cause: `Input data validation error: ${e}`,
                  }),
              ),
            );

            const dbRow = yield* Effect.tryPromise({
              try: async () => {
                const res = await db
                  .insert(memberTable)
                  .values(memberToInsert)
                  .returning()
                  .get();
                if (!res) {
                  throw new MemberDbError({
                    cause: "Failed to insert member, no result returned.",
                  });
                }
                return res as Member;
              },
              catch: (unknownError) => {
                if (unknownError instanceof MemberDbError) return unknownError;
                return new MemberDbError({ cause: unknownError });
              },
            });

            const createdAtDate =
              dbRow.createdAt instanceof Date
                ? dbRow.createdAt
                : new Date((dbRow.createdAt as unknown as number) * 1000);
            const updatedAtDate =
              dbRow.updatedAt instanceof Date
                ? dbRow.updatedAt
                : new Date((dbRow.updatedAt as unknown as number) * 1000);

            return {
              id: dbRow.id,
              userId: dbRow.userId,
              organizationId: dbRow.organizationId,
              role: dbRow.role,
              createdAt: createdAtDate,
              updatedAt: updatedAtDate,
            } satisfies Member;
          }).pipe(Effect.withSpan("MemberRepo.createMember"));

        return effectLogic;
      },

      findMembership: (userId: string) =>
        Effect.gen(function* (_) {
          const dbResult = yield* _(
            Effect.tryPromise({
              try: async () => {
                return await db
                  .select()
                  .from(memberTable)
                  .where(eq(memberTable.userId, userId))
                  .limit(1);
              },
              catch: (unknownError) =>
                new MemberDbError({ cause: unknownError }), // This becomes MemberDbError in the Effect error channel
            }),
          );

          if (!dbResult || dbResult.length === 0) {
            // If the service interface expects MemberNotFoundError for not found cases:
            // return yield* _(Effect.fail(new MemberNotFoundError()));
            // If the service interface expects Option.none for not found and MemberNotFoundError for other errors:
            return Option.none(); // Correctly return Option.none()
          }

          // Process and return Option.some(member)
          const dbRow = dbResult[0] as Member; // Assuming dbResult[0] is compatible with Member structure

          // Ensure createdAt and updatedAt are Date objects
          const createdAtDate =
            dbRow.createdAt instanceof Date
              ? dbRow.createdAt
              : new Date((dbRow.createdAt as unknown as number) * 1000);
          const updatedAtDate =
            dbRow.updatedAt instanceof Date
              ? dbRow.updatedAt
              : new Date((dbRow.updatedAt as unknown as number) * 1000);

          const member = {
            id: dbRow.id,
            userId: dbRow.userId,
            organizationId: dbRow.organizationId,
            role: dbRow.role,
            createdAt: createdAtDate,
            updatedAt: updatedAtDate,
          } satisfies Member;

          return Option.some(member); // Correctly return Option.some(member)
        }).pipe(Effect.withSpan("MemberRepo.findMembership")),
    };
  }),
);
