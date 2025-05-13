import { Context, type Effect } from "effect";
import type { DbError } from "../auth/service";
import type { Email } from "../email/model";
import type { User, UserId, UserNotFoundError } from "./model";

export abstract class UserRepo extends Context.Tag("@core/user/UserRepo")<
  UserRepo,
  {
    readonly findByEmail: (
      email: Email,
    ) => Effect.Effect<User, UserNotFoundError | DbError>;
    readonly findById: (
      id: UserId,
    ) => Effect.Effect<User, UserNotFoundError | DbError>;
    // Potentially add:
    // readonly update: (user: User) => Effect.Effect<User, UserError>;
    // readonly delete: (id: User["id"]) => Effect.Effect<void, UserError>;
  }
>() {}
