import { Context, Data, type Effect, Option } from "effect";
import type {
  Campaign,
  CampaignAnalytics,
  CampaignId,
  CreateCampaignInput,
  ExecuteCampaignInput,
  UpdateCampaignInput,
} from "./models";

// Service-level errors following Effect patterns
export class CampaignRepositoryError extends Data.TaggedError(
  "CampaignRepositoryError"
)<{
  readonly message: string;
  readonly cause?: unknown;
  readonly operation: string;
}> {}

export class CampaignUseCaseError extends Data.TaggedError(
  "CampaignUseCaseError"
)<{
  readonly message: string;
  readonly campaignId?: CampaignId;
  readonly operation: string;
  readonly cause?: unknown;
}> {}

export class CampaignDOError extends Data.TaggedError("CampaignDOError")<{
  readonly message: string;
  readonly campaignId?: CampaignId;
  readonly cause?: unknown;
}> {}

// Database-level errors (infrastructure layer)
export class DbError extends Data.TaggedError("DbError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly table?: string;
  readonly operation?: string;
}> {}

// Repository interface for campaign data access
export abstract class CampaignRepo extends Context.Tag(
  "@campaigns/CampaignRepo"
)<
  CampaignRepo,
  {
    readonly get: (
      campaignId: CampaignId
    ) => Effect.Effect<Option.Option<Campaign>, CampaignRepositoryError>;
    readonly create: (
      data: CreateCampaignInput
    ) => Effect.Effect<Campaign, CampaignRepositoryError>;
    readonly update: (
      campaignId: CampaignId,
      data: UpdateCampaignInput
    ) => Effect.Effect<Campaign, CampaignRepositoryError>;
    readonly delete: (
      campaignId: CampaignId
    ) => Effect.Effect<void, CampaignRepositoryError>;
    readonly list: (options?: {
      limit?: number;
      cursor?: string;
      status?: string;
    }) => Effect.Effect<
      {
        campaigns: Campaign[];
        hasMore: boolean;
        cursor: string | null;
      },
      CampaignRepositoryError
    >;
    readonly getBySegment: (
      segmentId: string,
      options?: { limit?: number; cursor?: string }
    ) => Effect.Effect<
      {
        campaigns: Campaign[];
        hasMore: boolean;
        cursor: string | null;
      },
      CampaignRepositoryError
    >;
    readonly updateStatus: (
      campaignId: CampaignId,
      status: Campaign["status"]
    ) => Effect.Effect<Campaign, CampaignRepositoryError>;
  }
>() {}

// Use case interface for campaign business logic
export abstract class CampaignUseCase extends Context.Tag(
  "@campaigns/CampaignUseCase"
)<
  CampaignUseCase,
  {
    readonly getCampaign: (
      campaignId: CampaignId
    ) => Effect.Effect<Campaign, CampaignUseCaseError>;
    readonly createCampaign: (
      data: CreateCampaignInput
    ) => Effect.Effect<Campaign, CampaignUseCaseError>;
    readonly updateCampaign: (
      campaignId: CampaignId,
      data: UpdateCampaignInput
    ) => Effect.Effect<Campaign, CampaignUseCaseError>;
    readonly deleteCampaign: (
      campaignId: CampaignId
    ) => Effect.Effect<void, CampaignUseCaseError>;
    readonly listCampaigns: (options?: {
      limit?: number;
      cursor?: string;
      status?: string;
    }) => Effect.Effect<
      {
        campaigns: Campaign[];
        hasMore: boolean;
        cursor: string | null;
      },
      CampaignUseCaseError
    >;
    readonly executeCampaign: (
      data: ExecuteCampaignInput
    ) => Effect.Effect<
      { success: boolean; messagesSent: number },
      CampaignUseCaseError
    >;
    readonly scheduleCampaign: (
      campaignId: CampaignId,
      scheduledAt: Date
    ) => Effect.Effect<Campaign, CampaignUseCaseError>;
    readonly pauseCampaign: (
      campaignId: CampaignId
    ) => Effect.Effect<Campaign, CampaignUseCaseError>;
    readonly resumeCampaign: (
      campaignId: CampaignId
    ) => Effect.Effect<Campaign, CampaignUseCaseError>;
    readonly getCampaignAnalytics: (
      campaignId: CampaignId
    ) => Effect.Effect<CampaignAnalytics, CampaignUseCaseError>;
  }
>() {}

/**
 * Durable Object service for distributed campaign operations
 */
export abstract class CampaignDOService extends Context.Tag(
  "domain/services/CampaignDO"
)<
  CampaignDOService,
  {
    readonly getCampaign: (
      campaignId: CampaignId
    ) => Effect.Effect<Campaign, CampaignDOError>;
    readonly createCampaign: (
      data: CreateCampaignInput
    ) => Effect.Effect<Campaign, CampaignDOError>;
    readonly updateCampaign: (
      campaignId: CampaignId,
      data: UpdateCampaignInput
    ) => Effect.Effect<Campaign, CampaignDOError>;
    readonly deleteCampaign: (
      campaignId: CampaignId
    ) => Effect.Effect<void, CampaignDOError>;
    readonly listCampaigns: (options?: {
      limit?: number;
      cursor?: string;
      status?: string;
    }) => Effect.Effect<
      {
        campaigns: Campaign[];
        hasMore: boolean;
        cursor: string | null;
      },
      CampaignDOError
    >;
    readonly executeCampaign: (
      data: ExecuteCampaignInput
    ) => Effect.Effect<
      { success: boolean; messagesSent: number },
      CampaignDOError
    >;
  }
>() {}
