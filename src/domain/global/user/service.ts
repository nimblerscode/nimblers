import { Context, type Effect } from "effect";
import type { DbError } from "../auth/service";
import type { Email } from "../email/model";
import type { NewMembership, User, UserId, UserNotFoundError } from "./model";

export abstract class UserRepo extends Context.Tag("@core/user/UserRepo")<
  UserRepo,
  {
    readonly findByEmail: (
      email: Email
    ) => Effect.Effect<User, UserNotFoundError | DbError>;
    readonly findById: (
      id: UserId
    ) => Effect.Effect<User, UserNotFoundError | DbError>;
    readonly createMemberOrg: (
      data: NewMembership
    ) => Effect.Effect<void, DbError>;
    readonly getUsers: (memberIds: UserId[]) => Effect.Effect<User[], DbError>;
  }
>() {}
