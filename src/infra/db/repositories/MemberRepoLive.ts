import { and, eq } from "drizzle-orm"; // Import and for where clause
import { Effect, Layer } from "effect";
import { Schema as S } from "effect";
import { v4 as uuidv4 } from "uuid";

import { type Member, NewMemberSchema } from "@/core/member/model";
import {
  MemberDbError,
  MemberNotFoundError,
  MemberRepo,
} from "@/core/member/service";

import { DrizzleDOClient } from "../drizzle/drizzleDO";
import { member as memberTable } from "../schemas/schema.tenant";

export const MemberRepoLive = Layer.effect(
  MemberRepo,
  Effect.gen(function* (_) {
    const { db } = yield* _(DrizzleDOClient);

    return {
      createMember: (data: Member) =>
        Effect.gen(function* (_) {
          const memberId = data.id ?? uuidv4();
          const memberToInsert = {
            ...data,
            id: memberId,
          };

          // Validate data against schema before insertion (ignore createdAt)
          const validatedData = yield* _(
            S.decodeUnknown(NewMemberSchema)({ ...memberToInsert }),
            Effect.mapError((e) => new MemberDbError({ cause: e.toString() })),
          );

          const result = yield* _(
            Effect.tryPromise({
              try: async () => {
                const res = await db
                  .insert(memberTable)
                  .values(validatedData)
                  .returning();

                if (!res || res.length === 0) {
                  throw new MemberDbError({
                    cause: "Failed to insert member, no result returned.",
                  });
                }
                // Convert createdAt to ISO string for domain model
                const dbRow = res[0];
                return {
                  ...dbRow,
                  createdAt:
                    typeof dbRow.createdAt === "number"
                      ? new Date(dbRow.createdAt * 1000).toISOString()
                      : dbRow.createdAt instanceof Date
                        ? dbRow.createdAt.toISOString()
                        : dbRow.createdAt,
                };
              },
              catch: (unknownError) => {
                if (unknownError instanceof MemberDbError) {
                  return unknownError;
                }
                return new MemberDbError({ cause: unknownError });
              },
            }),
          );

          // Decode the DB result to Member (converts createdAt to ISO string)
          return yield* _(
            S.decodeUnknown(NewMemberSchema)(result),
            Effect.mapError((e) => new MemberDbError({ cause: e.toString() })),
          );
        }).pipe(Effect.withSpan("MemberRepo.createMember")),

      findMembership: (userId: string, organizationId: string) =>
        Effect.gen(function* (_) {
          const result = yield* _(
            Effect.tryPromise({
              try: async () => {
                return await db
                  .select()
                  .from(memberTable)
                  .where(
                    and(
                      eq(memberTable.userId, userId),
                      eq(memberTable.organizationId, organizationId),
                    ),
                  )
                  .limit(1);
              },
              catch: (unknownError) =>
                new MemberDbError({ cause: unknownError }),
            }),
          );

          if (!result || result.length === 0) {
            return yield* _(Effect.fail(new MemberNotFoundError()));
          }
          // Convert createdAt to ISO string for domain model
          const dbRow = result[0];
          const memberRow = {
            ...dbRow,
            createdAt:
              typeof dbRow.createdAt === "number"
                ? new Date(dbRow.createdAt * 1000).toISOString()
                : dbRow.createdAt instanceof Date
                  ? dbRow.createdAt.toISOString()
                  : dbRow.createdAt,
          };
          // Decode the raw database result to Member schema
          return yield* _(
            S.decodeUnknown(NewMemberSchema)(memberRow),
            Effect.mapError((e) => new MemberDbError({ cause: e.toString() })),
          );
        }).pipe(Effect.withSpan("MemberRepo.findMembership")),
    };
  }),
);
