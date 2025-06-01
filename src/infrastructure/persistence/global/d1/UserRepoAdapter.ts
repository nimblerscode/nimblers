import { Effect, Layer, Option } from "effect";
import type { Email } from "@/domain/global/email/model";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import {
  type NewMembership,
  type User,
  type UserId,
  UserNotFoundError,
} from "@/domain/global/user/model";
import {
  MembershipAlreadyExistsError,
  MembershipCreationError,
  type NewOrganization,
  OrganizationCreationError,
  OrganizationLookupError,
  OrganizationSlugConflictError,
  UserLookupError,
  UserRepo,
  UsersRetrievalError,
} from "@/domain/global/user/service";
import type { OrganizationId } from "@/domain/shopify/store/models";
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
              new UserLookupError({
                message: `Failed to lookup user by ID: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                identifier: { type: "id", value: userId },
                cause: error,
              }),
          });

          if (!userResult) {
            return yield* Effect.fail(
              new UserNotFoundError({
                message: "User not found",
                identifier: { type: "id", value: userId },
              }),
            );
          }
          return userResult;
        }),

      findByEmail: (email: Email) =>
        Effect.gen(function* (_) {
          const userResult = yield* _(
            Effect.tryPromise({
              try: () => drizzleAdapter.findByEmail(email),
              catch: (error) =>
                new UserLookupError({
                  message: `Failed to lookup user by email: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                  identifier: { type: "email", value: email },
                  cause: error,
                }),
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

      createMemberOrg: (data: NewMembership) =>
        Effect.tryPromise({
          try: () => drizzleAdapter.createMemberOrg(data),
          catch: (error: unknown) => {
            // Check for specific database constraint violations
            if (
              error instanceof Error &&
              error.message.includes("UNIQUE constraint")
            ) {
              return new MembershipAlreadyExistsError({
                message: "User is already a member of this organization",
                userId: data.userId,
                organizationId: data.organizationId,
              });
            }

            return new MembershipCreationError({
              message: `Failed to create organization membership: ${
                error instanceof Error ? error.message : String(error)
              }`,
              userId: data.userId,
              organizationId: data.organizationId,
              cause: error,
            });
          },
        }),

      getUsers: (memberIds: UserId[]) =>
        Effect.gen(function* () {
          const users = yield* Effect.tryPromise({
            try: () => drizzleAdapter.getUsers(memberIds),
            catch: (error) =>
              new UsersRetrievalError({
                message: `Failed to retrieve users: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                requestedIds: memberIds,
                cause: error,
              }),
          });
          return users;
        }),

      createOrganization: (data: NewOrganization) =>
        Effect.tryPromise({
          try: () => drizzleAdapter.createOrganization(data),
          catch: (error: unknown) => {
            // Check for slug conflict errors
            if (
              error instanceof Error &&
              error.message.includes("UNIQUE constraint")
            ) {
              return new OrganizationSlugConflictError({
                message: "An organization with this slug already exists",
                slug: data.slug,
              });
            }

            return new OrganizationCreationError({
              message: `Failed to create organization: ${
                error instanceof Error ? error.message : String(error)
              }`,
              slug: data.slug,
              cause: error,
            });
          },
        }),

      findOrganizationById: (organizationId: OrganizationId) =>
        Effect.gen(function* () {
          const org = yield* Effect.tryPromise({
            try: () => drizzleAdapter.findOrganizationById(organizationId),
            catch: (error) =>
              new OrganizationLookupError({
                message: `Failed to lookup organization by ID: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                identifier: { type: "id", value: organizationId },
                cause: error,
              }),
          });
          return Option.fromNullable(org);
        }),

      findOrganizationBySlug: (slug: OrganizationSlug) =>
        Effect.gen(function* () {
          const org = yield* Effect.tryPromise({
            try: () => drizzleAdapter.findOrganizationBySlug(slug),
            catch: (error) =>
              new OrganizationLookupError({
                message: `Failed to lookup organization by slug: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                identifier: { type: "slug", value: slug },
                cause: error,
              }),
          });
          return Option.fromNullable(org);
        }),
    };
    return serviceMethods;
  }),
);
