import { Context, Data, Effect, Option } from "effect";
import type {
  Segment,
  SegmentId,
  CreateSegmentInput,
  UpdateSegmentInput,
  SegmentSyncInput,
  SegmentAnalytics,
} from "./models";

// Service-level errors following Effect patterns
export class SegmentRepositoryError extends Data.TaggedError(
  "SegmentRepositoryError"
)<{
  readonly message: string;
  readonly cause?: unknown;
  readonly operation: string;
}> {}

export class SegmentUseCaseError extends Data.TaggedError(
  "SegmentUseCaseError"
)<{
  readonly message: string;
  readonly segmentId?: SegmentId;
  readonly operation: string;
  readonly cause?: unknown;
}> {}

export class SegmentDOError extends Data.TaggedError("SegmentDOError")<{
  readonly message: string;
  readonly segmentId?: SegmentId;
  readonly cause?: unknown;
}> {}

// Missing error types
export class SegmentNotFoundError extends Data.TaggedError(
  "SegmentNotFoundError"
)<{
  readonly message: string;
  readonly segmentId: SegmentId;
  readonly operation: string;
}> {}

export class SegmentSyncError extends Data.TaggedError("SegmentSyncError")<{
  readonly message: string;
  readonly segmentId?: SegmentId;
  readonly cause?: unknown;
  readonly operation: string;
}> {}

// Database-level errors (infrastructure layer)
export class DbError extends Data.TaggedError("DbError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly table?: string;
  readonly operation?: string;
}> {}

// Repository interface for segment data access
export abstract class SegmentRepo extends Context.Tag("@segments/SegmentRepo")<
  SegmentRepo,
  {
    readonly get: (
      segmentId: SegmentId
    ) => Effect.Effect<Option.Option<Segment>, SegmentRepositoryError>;
    readonly create: (
      data: CreateSegmentInput
    ) => Effect.Effect<Segment, SegmentRepositoryError>;
    readonly update: (
      segmentId: SegmentId,
      data: UpdateSegmentInput
    ) => Effect.Effect<Segment, SegmentRepositoryError>;
    readonly delete: (
      segmentId: SegmentId
    ) => Effect.Effect<void, SegmentRepositoryError>;
    readonly list: (options?: {
      limit?: number;
      cursor?: string;
      type?: string;
      status?: string;
    }) => Effect.Effect<
      {
        segments: Segment[];
        hasMore: boolean;
        cursor: string | null;
      },
      SegmentRepositoryError
    >;
    readonly addUsers: (
      segmentId: SegmentId,
      userIds: string[]
    ) => Effect.Effect<void, SegmentRepositoryError>;
    readonly removeUsers: (
      segmentId: SegmentId,
      userIds: string[]
    ) => Effect.Effect<void, SegmentRepositoryError>;
    readonly getUsersInSegment: (
      segmentId: SegmentId,
      options?: { limit?: number; cursor?: string }
    ) => Effect.Effect<
      {
        userIds: string[];
        hasMore: boolean;
        cursor: string | null;
      },
      SegmentRepositoryError
    >;
    readonly updateStatus: (
      segmentId: SegmentId,
      status: Segment["status"]
    ) => Effect.Effect<Segment, SegmentRepositoryError>;
  }
>() {}

// Use case interface for segment business logic
export abstract class SegmentUseCase extends Context.Tag(
  "@segments/SegmentUseCase"
)<
  SegmentUseCase,
  {
    readonly getSegment: (
      segmentId: SegmentId
    ) => Effect.Effect<Segment, SegmentUseCaseError>;
    readonly createSegment: (
      data: CreateSegmentInput
    ) => Effect.Effect<Segment, SegmentUseCaseError>;
    readonly updateSegment: (
      segmentId: SegmentId,
      data: UpdateSegmentInput
    ) => Effect.Effect<Segment, SegmentUseCaseError>;
    readonly deleteSegment: (
      segmentId: SegmentId
    ) => Effect.Effect<void, SegmentUseCaseError>;
    readonly listSegments: (options?: {
      limit?: number;
      cursor?: string;
      type?: string;
      status?: string;
    }) => Effect.Effect<
      {
        segments: Segment[];
        hasMore: boolean;
        cursor: string | null;
      },
      SegmentUseCaseError
    >;
    readonly addUsersToSegment: (
      segmentId: SegmentId,
      userIds: string[]
    ) => Effect.Effect<void, SegmentUseCaseError>;
    readonly removeUsersFromSegment: (
      segmentId: SegmentId,
      userIds: string[]
    ) => Effect.Effect<void, SegmentUseCaseError>;
    readonly getUsersInSegment: (
      segmentId: SegmentId,
      options?: { limit?: number; cursor?: string }
    ) => Effect.Effect<
      {
        userIds: string[];
        hasMore: boolean;
        cursor: string | null;
      },
      SegmentUseCaseError
    >;
    readonly syncSegment: (
      data: SegmentSyncInput
    ) => Effect.Effect<
      { success: boolean; syncedUsers: number },
      SegmentUseCaseError | SegmentSyncError
    >;
    readonly getSegmentAnalytics: (
      segmentId: SegmentId
    ) => Effect.Effect<SegmentAnalytics, SegmentUseCaseError>;
  }
>() {}

/**
 * Durable Object service for distributed segment operations
 */
export abstract class SegmentDOService extends Context.Tag(
  "domain/services/SegmentDO"
)<
  SegmentDOService,
  {
    readonly getSegment: (
      segmentId: SegmentId
    ) => Effect.Effect<Segment, SegmentDOError>;
    readonly createSegment: (
      data: CreateSegmentInput
    ) => Effect.Effect<Segment, SegmentDOError>;
    readonly updateSegment: (
      segmentId: SegmentId,
      data: UpdateSegmentInput
    ) => Effect.Effect<Segment, SegmentDOError>;
    readonly deleteSegment: (
      segmentId: SegmentId
    ) => Effect.Effect<void, SegmentDOError>;
    readonly listSegments: (options?: {
      limit?: number;
      cursor?: string;
      type?: string;
      status?: string;
    }) => Effect.Effect<
      {
        segments: Segment[];
        hasMore: boolean;
        cursor: string | null;
      },
      SegmentDOError
    >;
    readonly addUsersToSegment: (
      segmentId: SegmentId,
      userIds: string[]
    ) => Effect.Effect<void, SegmentDOError>;
  }
>() {}
