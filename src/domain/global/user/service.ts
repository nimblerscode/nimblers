import { Context, Data, type Effect, type Option } from "effect";
import type { OrganizationId } from "@/domain/shopify/store/models";
import type { Email } from "../email/model";
import type { OrganizationSlug } from "../organization/models";
import type { NewMembership, User, UserId, UserNotFoundError } from "./model";

// === Organization Types ===
export interface NewOrganization {
  id: OrganizationId;
  slug: OrganizationSlug;
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
  userId: UserId;
  organizationId: OrganizationId;
  cause?: unknown;
}> {}

export class MembershipAlreadyExistsError extends Data.TaggedError(
  "MembershipAlreadyExistsError",
)<{
  message: string;
  userId: UserId;
  organizationId: OrganizationId;
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
  slug: OrganizationSlug;
  cause?: unknown;
}> {}

export class OrganizationSlugConflictError extends Data.TaggedError(
  "OrganizationSlugConflictError",
)<{
  message: string;
  slug: OrganizationSlug;
}> {}

export class OrganizationLookupError extends Data.TaggedError(
  "OrganizationLookupError",
)<{
  message: string;
  identifier:
    | { type: "id"; value: OrganizationId }
    | { type: "slug"; value: OrganizationSlug };
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
      organizationId: OrganizationId,
    ) => Effect.Effect<Option.Option<Organization>, OrganizationLookupError>;
    readonly findOrganizationBySlug: (
      slug: OrganizationSlug,
    ) => Effect.Effect<Option.Option<Organization>, OrganizationLookupError>;
  }
>() {}
