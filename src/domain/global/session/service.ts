import { Context, type Effect, Schema as S } from "effect";
import type { UserId } from "../user/model";

// === Errors ===
export class SessionNotFoundError extends S.TaggedError<SessionNotFoundError>()(
  "SessionNotFoundError",
  {
    userId: S.String,
  },
) {}

export class SessionUpdateError extends S.TaggedError<SessionUpdateError>()(
  "SessionUpdateError",
  {
    message: S.String,
    cause: S.Unknown,
  },
) {}

export type SessionServiceError = SessionNotFoundError | SessionUpdateError;

// === Session Repository Port ===
export abstract class SessionRepo extends Context.Tag("@core/SessionRepo")<
  SessionRepo,
  {
    readonly getActiveOrganizationId: (
      userId: UserId,
    ) => Effect.Effect<string | null, SessionServiceError>;
    readonly updateActiveOrganizationId: (
      userId: UserId,
      organizationId: string,
    ) => Effect.Effect<void, SessionServiceError>;
  }
>() {}

// === Session Use Case ===
export abstract class SessionUseCase extends Context.Tag(
  "@core/SessionUseCase",
)<
  SessionUseCase,
  {
    readonly getActiveOrganization: (
      userId: UserId,
    ) => Effect.Effect<string | null, SessionServiceError>;
    readonly switchActiveOrganization: (
      userId: UserId,
      organizationId: string,
    ) => Effect.Effect<void, SessionServiceError>;
  }
>() {}
