import type { Session, User } from "better-auth";
import { Schema as S } from "effect";
import { Context, type Effect } from "effect";
import type { Account } from "./model";

// === Errors ===
export class UserNotFoundError extends S.TaggedError<UserNotFoundError>()(
  "UserNotFoundError",
  { identifier: S.String }
) {}

export class InvalidCredentialsError extends S.TaggedError<InvalidCredentialsError>()(
  "InvalidCredentialsError",
  {}
) {}

export class AccountNotFoundError extends S.TaggedError<AccountNotFoundError>()(
  "AccountNotFoundError",
  { userId: S.String, providerId: S.String }
) {}

// Placeholder for generic DB errors
export class DbError extends S.TaggedError<DbError>()(
  "DbError",
  { cause: S.Unknown } // Store the original cause
) {}

export type AuthRepoError = UserNotFoundError | AccountNotFoundError | DbError;

// Placeholder Error for high-level auth failures
export class AuthServiceError extends S.TaggedError<AuthServiceError>()(
  "AuthServiceError",
  { message: S.String, cause: S.optional(S.Unknown) }
) {}

export type AuthSessionError =
  | UserNotFoundError
  | AccountNotFoundError
  | DbError;

// === Service Interfaces (Ports) using Context.GenericTag ===

// --- Auth Repository Port ---

// Type alias for input data when creating an account
export type AccountData = Omit<Account, "id" | "createdAt" | "updatedAt">;

// --- Auth Service Port (Abstraction over better-auth) ---
// Define the Tag using GenericTag and the interface
export class AuthService extends Context.Tag("core/auth/AuthService")<
  AuthService,
  {
    readonly handler: () => Effect.Effect<Response, AuthServiceError>;
    readonly getSession: () => Effect.Effect<
      { session: Session; user: User },
      AuthServiceError
    >;
  }
>() {}
