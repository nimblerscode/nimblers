import { eq } from "drizzle-orm";
import { Effect, Layer, Option, Schema as S } from "effect";
import { v4 as uuidv4 } from "uuid";
import type { Email } from "@/domain/global/email/model";
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
              Effect.mapError((e) => {
                return new MemberDbError({
                  cause: `Input data validation error: ${e}`,
                });
              }),
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

            const finalMember = {
              id: dbRow.id,
              userId: dbRow.userId,
              role: dbRow.role,
              createdAt: createdAtDate,
            } satisfies Member;

            return finalMember;
          }).pipe(Effect.withSpan("MemberRepo.createMember"));

        return effectLogic;
      },

      findMembership: (email: Email) =>
        Effect.gen(function* (_) {
          const dbResult = yield* _(
            Effect.tryPromise({
              try: async () => {
                return await db
                  .select()
                  .from(memberTable)
                  .where(eq(memberTable.userId, email))
                  .limit(1);
              },
              catch: (unknownError) =>
                new MemberDbError({ cause: unknownError }),
            }),
          );

          if (!dbResult || dbResult.length === 0) {
            return Option.none();
          }

          const dbRow = dbResult[0] as Member;

          const createdAtDate =
            dbRow.createdAt instanceof Date
              ? dbRow.createdAt
              : new Date((dbRow.createdAt as unknown as number) * 1000);

          const member = {
            id: dbRow.id,
            userId: dbRow.userId,
            role: dbRow.role,
            createdAt: createdAtDate,
          } satisfies Member;

          return Option.some(member);
        }).pipe(Effect.withSpan("MemberRepo.findMembership")),

      getMembers: Effect.gen(function* () {
        const dbResult = yield* Effect.tryPromise({
          try: async () => {
            return await db.select().from(memberTable);
          },
          catch: (unknownError) => new MemberDbError({ cause: unknownError }),
        });

        return dbResult.map((dbRow) => {
          const createdAtDate =
            dbRow.createdAt instanceof Date
              ? dbRow.createdAt
              : new Date((dbRow.createdAt as unknown as number) * 1000);

          return {
            id: dbRow.id,
            userId: dbRow.userId as Member["userId"],
            role: dbRow.role,
            createdAt: createdAtDate,
          } satisfies Member;
        });
      }).pipe(Effect.withSpan("MemberRepo.getMembers")),
    };
  }),
);
