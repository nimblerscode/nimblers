import { Context, type Effect, type Option } from "effect";
import type { User } from "../auth/model";
import type { Email } from "../organization/invitations/models";
import type { NewUser, UserError } from "./models";

export abstract class UserRepo extends Context.Tag("@core/user/UserRepo")<
  UserRepo,
  {
    readonly findByEmail: (
      email: Email,
    ) => Effect.Effect<Option.Option<User>, UserError>;
    readonly findById: (
      id: User["id"],
    ) => Effect.Effect<Option.Option<User>, UserError>;
    readonly create: (userData: NewUser) => Effect.Effect<User, UserError>;
    // Potentially add:
    // readonly update: (user: User) => Effect.Effect<User, UserError>;
    // readonly delete: (id: User["id"]) => Effect.Effect<void, UserError>;
  }
>() {}
