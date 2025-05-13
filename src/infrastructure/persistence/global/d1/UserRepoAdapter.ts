import { DbError } from "@/domain/global/auth/service";
import type { Email } from "@/domain/global/email/model";
import {
  type User,
  type UserId,
  UserNotFoundError,
} from "@/domain/global/user/model";
import { UserRepo } from "@/domain/global/user/service";
import { Effect, Layer } from "effect";
import { makeUserDrizzleAdapter } from "./UserDrizzleAdapter";
import { DrizzleD1Client } from "./drizzle";
import { user as userTable } from "./schema";

export const UserRepoLive = Layer.effect(
  UserRepo,
  Effect.gen(function* () {
    const db = yield* DrizzleD1Client;
    const drizzleAdapter = makeUserDrizzleAdapter(db, userTable);
    const serviceMethods = {
      findById: (userId: UserId) =>
        Effect.gen(function* (_) {
          const userResult: User | undefined = yield* _(
            Effect.tryPromise({
              try: () => drizzleAdapter.findById(userId),
              catch: (error) => new DbError({ cause: error }),
            }),
          );
          if (!userResult) {
            return yield* _(
              Effect.fail(
                new UserNotFoundError({
                  message: "User not found",
                  identifier: { type: "id", value: userId },
                }),
              ),
            );
          }
          return userResult as User;
        }),

      findByEmail: (email: Email) =>
        Effect.gen(function* (_) {
          const userResult = yield* _(
            Effect.tryPromise({
              try: () => drizzleAdapter.findByEmail(email),
              catch: (error) => new DbError({ cause: error }),
            }),
          );
          if (!userResult) {
            return yield* _(
              Effect.fail(
                new UserNotFoundError({
                  message: "User not found",
                  identifier: { type: "email", value: email },
                }),
              ),
            );
          }
          return userResult;
        }),
    };
    return serviceMethods;
    // const drizzleAdapter = makeUserDrizzleAdapter(db, userTable);
    // const userEffectAdapter = makeUserEffectAdapter(drizzleAdapter);
    // return userEffectAdapter;
  }),

  // Effect.map(DrizzleD1Client, (db) =>
  //   makeUserEffectAdapter(makeUserDrizzleAdapter(db, userTable))
  // )
);

// export const UserRepo = UserRepoLive.pipe(Layer.extend(UserRepoLive));
