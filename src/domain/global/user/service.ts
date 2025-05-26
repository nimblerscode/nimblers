import { Context, type Effect, type Option } from "effect";
import type { DbError } from "../auth/service";
import type { Email } from "../email/model";
import type { NewMembership, User, UserId, UserNotFoundError } from "./model";

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

export abstract class UserRepo extends Context.Tag("@core/user/UserRepo")<
  UserRepo,
  {
    readonly findByEmail: (
      email: Email,
    ) => Effect.Effect<User, UserNotFoundError | DbError>;
    readonly findById: (
      id: UserId,
    ) => Effect.Effect<User, UserNotFoundError | DbError>;
    readonly createMemberOrg: (
      data: NewMembership,
    ) => Effect.Effect<void, DbError>;
    readonly getUsers: (memberIds: UserId[]) => Effect.Effect<User[], DbError>;
    readonly createOrganization: (
      data: NewOrganization,
    ) => Effect.Effect<Organization, DbError>;
    readonly findOrganizationById: (
      organizationId: string,
    ) => Effect.Effect<Option.Option<Organization>, DbError>;
    readonly findOrganizationBySlug: (
      slug: string,
    ) => Effect.Effect<Option.Option<Organization>, DbError>;
  }
>() {}
