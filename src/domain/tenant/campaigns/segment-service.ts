import { Context, Effect } from "effect";
import type {
  CampaignSegment,
  CreateCampaignSegmentInput,
  CampaignSegmentRepositoryError,
  CampaignId,
  SegmentId,
} from "./models";

// === Campaign Segment Repository ===
export abstract class CampaignSegmentRepo extends Context.Tag(
  "@core/CampaignSegmentRepo"
)<
  CampaignSegmentRepo,
  {
    readonly create: (
      data: CreateCampaignSegmentInput
    ) => Effect.Effect<CampaignSegment, CampaignSegmentRepositoryError>;
    readonly bulkCreate: (
      campaignId: CampaignId,
      segmentIds: SegmentId[]
    ) => Effect.Effect<CampaignSegment[], CampaignSegmentRepositoryError>;
    readonly delete: (
      campaignId: CampaignId,
      segmentId: SegmentId
    ) => Effect.Effect<void, CampaignSegmentRepositoryError>;
    readonly listByCampaign: (
      campaignId: CampaignId
    ) => Effect.Effect<CampaignSegment[], CampaignSegmentRepositoryError>;
    readonly listBySegment: (
      segmentId: SegmentId
    ) => Effect.Effect<CampaignSegment[], CampaignSegmentRepositoryError>;
  }
>() {}

// === Campaign Segment Use Case ===
export abstract class CampaignSegmentUseCase extends Context.Tag(
  "@core/CampaignSegmentUseCase"
)<
  CampaignSegmentUseCase,
  {
    readonly createCampaignSegments: (
      campaignId: CampaignId,
      segmentIds: SegmentId[]
    ) => Effect.Effect<CampaignSegment[], CampaignSegmentRepositoryError>;
    readonly getCampaignSegments: (
      campaignId: CampaignId
    ) => Effect.Effect<CampaignSegment[], CampaignSegmentRepositoryError>;
    readonly getSegmentCampaigns: (
      segmentId: SegmentId
    ) => Effect.Effect<CampaignSegment[], CampaignSegmentRepositoryError>;
  }
>() {}
