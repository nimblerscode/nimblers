import { Effect, Layer, Option } from "effect";
import { DbError } from "@/domain/global/auth/service";
import type { Email } from "@/domain/global/email/model";
import {
  type NewMembership,
  type User,
  type UserId,
  UserNotFoundError,
} from "@/domain/global/user/model";
import { UserRepo } from "@/domain/global/user/service";
import { DrizzleD1Client } from "./drizzle";
import { user as userTable } from "./schema";
import { makeUserDrizzleAdapter } from "./UserDrizzleAdapter";

export const UserRepoLive = Layer.effect(
  UserRepo,
  Effect.gen(function* () {
    const db = yield* DrizzleD1Client;
    const drizzleAdapter = makeUserDrizzleAdapter(db, userTable);
    const serviceMethods = {
      findById: (userId: UserId) =>
        Effect.gen(function* () {
          const userResult: User | undefined = yield* Effect.tryPromise({
            try: () => drizzleAdapter.findById(userId),
            catch: (error) =>
              new DbError({ message: error.message, cause: error }),
          });

          if (!userResult) {
            return yield* Effect.fail(
              new UserNotFoundError({
                message: "User not found",
                identifier: { type: "id", value: userId },
              })
            );
          }
          return userResult;
        }),

      findByEmail: (email: Email) =>
        Effect.gen(function* (_) {
          const userResult = yield* _(
            Effect.tryPromise({
              try: () => drizzleAdapter.findByEmail(email),
              catch: (error) => new DbError({ cause: error }),
            })
          );
          if (!userResult) {
            return yield* _(
              Effect.fail(
                new UserNotFoundError({
                  message: "User not found",
                  identifier: { type: "email", value: email },
                })
              )
            );
          }
          return userResult;
        }),

      createMemberOrg: (data: NewMembership) =>
        Effect.tryPromise({
          try: () => drizzleAdapter.createMemberOrg(data),
          catch: (error: unknown) => new DbError({ cause: error }),
        }),

      getUsers: (memberIds: UserId[]) =>
        Effect.gen(function* () {
          const users = yield* Effect.tryPromise({
            try: () => drizzleAdapter.getUsers(memberIds),
            catch: (error) => new DbError({ cause: error }),
          });
          return users;
        }),

      createOrganization: (
        data: import("@/domain/global/user/service").NewOrganization
      ) =>
        Effect.tryPromise({
          try: () => drizzleAdapter.createOrganization(data),
          catch: (error: unknown) => new DbError({ cause: error }),
        }),

      findOrganizationById: (organizationId: string) =>
        Effect.gen(function* () {
          const org = yield* Effect.tryPromise({
            try: () => drizzleAdapter.findOrganizationById(organizationId),
            catch: (error) => new DbError({ cause: error }),
          });
          return Option.fromNullable(org);
        }),

      findOrganizationBySlug: (slug: string) =>
        Effect.gen(function* () {
          const org = yield* Effect.tryPromise({
            try: () => drizzleAdapter.findOrganizationBySlug(slug),
            catch: (error) => new DbError({ cause: error }),
          });
          return Option.fromNullable(org);
        }),
    };
    return serviceMethods;
  })
);
