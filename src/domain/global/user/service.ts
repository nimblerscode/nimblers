import { Context, Data, type Effect, type Option } from "effect";
import type { Email } from "../email/model";
import type { NewMembership, User, UserId, UserNotFoundError } from "./model";

// === Organization Types ===
export interface NewOrganization {
  id: string;
  slug: string;
  status?: string;
}

export interface Organization {
  id: string;
  slug: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// === User Service Specific Errors ===

export class UserLookupError extends Data.TaggedError("UserLookupError")<{
  message: string;
  identifier: { type: "email"; value: Email } | { type: "id"; value: string };
  cause?: unknown;
}> {}

export class MembershipCreationError extends Data.TaggedError(
  "MembershipCreationError",
)<{
  message: string;
  userId: string;
  organizationId: string;
  cause?: unknown;
}> {}

export class MembershipAlreadyExistsError extends Data.TaggedError(
  "MembershipAlreadyExistsError",
)<{
  message: string;
  userId: string;
  organizationId: string;
}> {}

export class UsersRetrievalError extends Data.TaggedError(
  "UsersRetrievalError",
)<{
  message: string;
  requestedIds: UserId[];
  cause?: unknown;
}> {}

export class OrganizationCreationError extends Data.TaggedError(
  "OrganizationCreationError",
)<{
  message: string;
  slug: string;
  cause?: unknown;
}> {}

export class OrganizationSlugConflictError extends Data.TaggedError(
  "OrganizationSlugConflictError",
)<{
  message: string;
  slug: string;
}> {}

export class OrganizationLookupError extends Data.TaggedError(
  "OrganizationLookupError",
)<{
  message: string;
  identifier: { type: "id"; value: string } | { type: "slug"; value: string };
  cause?: unknown;
}> {}

// === Service Interface ===
export abstract class UserRepo extends Context.Tag("@core/user/UserRepo")<
  UserRepo,
  {
    readonly findByEmail: (
      email: Email,
    ) => Effect.Effect<User, UserNotFoundError | UserLookupError>;
    readonly findById: (
      id: UserId,
    ) => Effect.Effect<User, UserNotFoundError | UserLookupError>;
    readonly createMemberOrg: (
      data: NewMembership,
    ) => Effect.Effect<
      void,
      MembershipCreationError | MembershipAlreadyExistsError
    >;
    readonly getUsers: (
      memberIds: UserId[],
    ) => Effect.Effect<User[], UsersRetrievalError>;
    readonly createOrganization: (
      data: NewOrganization,
    ) => Effect.Effect<
      Organization,
      OrganizationCreationError | OrganizationSlugConflictError
    >;
    readonly findOrganizationById: (
      organizationId: string,
    ) => Effect.Effect<Option.Option<Organization>, OrganizationLookupError>;
    readonly findOrganizationBySlug: (
      slug: string,
    ) => Effect.Effect<Option.Option<Organization>, OrganizationLookupError>;
  }
>() {}
