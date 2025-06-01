import { Context, Data, type Effect, type Option } from "effect";
import type { UserId } from "../user/model";
import type { OrganizationId } from "../organization/models";

// === Session Service Specific Errors ===

export class SessionNotFoundError extends Data.TaggedError(
  "SessionNotFoundError"
)<{
  message: string;
  userId: UserId;
}> {}

export class SessionLookupError extends Data.TaggedError("SessionLookupError")<{
  message: string;
  userId: UserId;
  cause?: unknown;
}> {}

export class SessionUpdateError extends Data.TaggedError("SessionUpdateError")<{
  message: string;
  userId: UserId;
  organizationId: OrganizationId;
  cause?: unknown;
}> {}

export class InvalidOrganizationError extends Data.TaggedError(
  "InvalidOrganizationError"
)<{
  message: string;
  organizationId: string;
  userId: UserId;
}> {}

export class SessionPermissionError extends Data.TaggedError(
  "SessionPermissionError"
)<{
  message: string;
  userId: string;
  organizationId: string;
  reason: string;
}> {}

export type SessionServiceError =
  | SessionNotFoundError
  | SessionLookupError
  | SessionUpdateError
  | InvalidOrganizationError
  | SessionPermissionError;

// === Session Repository Port ===
export abstract class SessionRepo extends Context.Tag("@core/SessionRepo")<
  SessionRepo,
  {
    readonly getActiveOrganizationId: (
      userId: UserId
    ) => Effect.Effect<Option.Option<string>, SessionLookupError>;
    readonly updateActiveOrganizationId: (
      userId: UserId,
      organizationId: string
    ) => Effect.Effect<void, SessionUpdateError | InvalidOrganizationError>;
  }
>() {}

// === Session Use Case ===
export abstract class SessionUseCase extends Context.Tag(
  "@core/SessionUseCase"
)<
  SessionUseCase,
  {
    readonly getActiveOrganization: (
      userId: UserId
    ) => Effect.Effect<Option.Option<string>, SessionLookupError>;
    readonly switchActiveOrganization: (
      userId: UserId,
      organizationId: string
    ) => Effect.Effect<
      void,
      SessionUpdateError | InvalidOrganizationError | SessionPermissionError
    >;
  }
>() {}
