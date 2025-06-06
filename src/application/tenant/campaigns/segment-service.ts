import { Effect, Layer } from "effect";
import {
  CampaignSegmentUseCase,
  CampaignSegmentRepo,
} from "@/domain/tenant/campaigns/segment-service";
import type { CampaignId, SegmentId } from "@/domain/tenant/campaigns/models";

export const CampaignSegmentUseCaseLive = () =>
  Layer.effect(
    CampaignSegmentUseCase,
    Effect.gen(function* () {
      const campaignSegmentRepo = yield* CampaignSegmentRepo;

      return {
        createCampaignSegments: (
          campaignId: CampaignId,
          segmentIds: SegmentId[]
        ) =>
          Effect.gen(function* () {
            // Use bulk create for efficiency
            const campaignSegments = yield* campaignSegmentRepo.bulkCreate(
              campaignId,
              segmentIds
            );
            return campaignSegments;
          }).pipe(
            Effect.withSpan("CampaignSegmentUseCase.createCampaignSegments")
          ),

        getCampaignSegments: (campaignId: CampaignId) =>
          Effect.gen(function* () {
            const campaignSegments = yield* campaignSegmentRepo.listByCampaign(
              campaignId
            );
            return campaignSegments;
          }).pipe(
            Effect.withSpan("CampaignSegmentUseCase.getCampaignSegments")
          ),

        getSegmentCampaigns: (segmentId: SegmentId) =>
          Effect.gen(function* () {
            const segmentCampaigns = yield* campaignSegmentRepo.listBySegment(
              segmentId
            );
            return segmentCampaigns;
          }).pipe(
            Effect.withSpan("CampaignSegmentUseCase.getSegmentCampaigns")
          ),
      };
    })
  );
