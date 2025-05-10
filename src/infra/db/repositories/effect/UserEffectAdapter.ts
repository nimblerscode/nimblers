import { User as UserModel } from "@/core/auth/model";
import { DbError, UserNotFoundError } from "@/core/auth/service";
import type { UserId, UserProfileUpdateData } from "@/core/user/service";
import { Effect, pipe } from "effect";
import { Schema as S } from "effect";
import type { schema } from "../../drizzle/drizzle";
import type { makeUserDrizzleAdapter } from "../adapters/UserDrizzleAdapter";

type User = typeof schema.user.$inferSelect;

const mapDbError = (error: unknown): DbError => {
  console.error("Database Operation Error:", error);
  return new DbError({ cause: error });
};

const decodeUser = (user: User) => {
  const dataToDecode = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    emailVerified: user.emailVerified,
  };
  return pipe(
    Effect.sync(() => S.decodeSync(UserModel)(dataToDecode)),
    Effect.mapError((decodeError) => mapDbError(decodeError)),
  );
};

export const makeUserEffectAdapter = (
  drizzleAdapter: ReturnType<typeof makeUserDrizzleAdapter>,
) => ({
  updateUserProfile: (userId: UserId, data: UserProfileUpdateData) =>
    Effect.gen(function* (_) {
      const userResult = yield* _(
        Effect.tryPromise({
          try: () => drizzleAdapter.updateUserProfile(userId, data),
          catch: mapDbError,
        }),
      );
      if (!userResult) {
        return yield* _(
          Effect.fail(new UserNotFoundError({ identifier: userId })),
        );
      }
      return yield* _(decodeUser(userResult));
    }),
});
