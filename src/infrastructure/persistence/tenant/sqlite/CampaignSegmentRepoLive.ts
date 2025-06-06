import { Effect, Layer } from "effect";
import { nanoid } from "nanoid";
import { CampaignSegmentRepo } from "@/domain/tenant/campaigns/segment-service";
import type {
  CampaignSegment,
  CreateCampaignSegmentInput,
  CampaignId,
  SegmentId,
} from "@/domain/tenant/campaigns/models";
import {
  CampaignSegmentNotFoundError,
  CampaignSegmentDbError,
} from "@/domain/tenant/campaigns/models";
import { DrizzleDOClient } from "./drizzle";
import { campaignSegment } from "./schema";
import { eq, and } from "drizzle-orm";

// Type for the actual database row
type SelectCampaignSegment = typeof campaignSegment.$inferSelect;
type InsertCampaignSegment = typeof campaignSegment.$inferInsert;

const convertToDomainCampaignSegment = (
  row: SelectCampaignSegment
): CampaignSegment => ({
  id: row.id as any, // Cast to branded type
  campaignId: row.campaignId as any, // Cast to branded type
  segmentId: row.segmentId as any, // Cast to branded type
  createdAt: new Date(row.createdAt),
});

const convertToInsertCampaignSegment = (
  data: CreateCampaignSegmentInput
): Omit<InsertCampaignSegment, "id" | "createdAt"> => ({
  campaignId: data.campaignId,
  segmentId: data.segmentId,
});

export const CampaignSegmentRepoLive = Layer.effect(
  CampaignSegmentRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;

    return {
      create: (data: CreateCampaignSegmentInput) =>
        Effect.gen(function* () {
          // Check for duplicate relationship
          const existingRelation = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(campaignSegment)
                .where(
                  and(
                    eq(campaignSegment.campaignId, data.campaignId),
                    eq(campaignSegment.segmentId, data.segmentId)
                  )
                )
                .limit(1),
            catch: (error) =>
              new CampaignSegmentDbError({
                message:
                  "Failed to check existing campaign-segment relationship",
                cause: error,
              }),
          });

          if (existingRelation.length > 0) {
            return yield* Effect.fail(
              new CampaignSegmentDbError({
                message: "Segment is already associated with this campaign",
              })
            );
          }

          const insertData = convertToInsertCampaignSegment(data);
          const now = new Date();
          const id = nanoid();

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(campaignSegment)
                .values({
                  id,
                  ...insertData,
                  createdAt: now,
                } satisfies typeof campaignSegment.$inferInsert)
                .returning(),
            catch: (error) =>
              new CampaignSegmentDbError({
                message: "Failed to create campaign-segment relationship",
                cause: error,
              }),
          });

          return convertToDomainCampaignSegment(result[0]);
        }),

      bulkCreate: (campaignId: CampaignId, segmentIds: SegmentId[]) =>
        Effect.gen(function* () {
          const now = new Date();
          const insertData = segmentIds.map((segmentId) => ({
            id: nanoid(),
            campaignId,
            segmentId,
            createdAt: now,
          }));

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(campaignSegment)
                .values(insertData)
                .onConflictDoNothing()
                .returning(),
            catch: (error) =>
              new CampaignSegmentDbError({
                message: "Failed to bulk create campaign-segment relationships",
                cause: error,
              }),
          });

          return result.map(convertToDomainCampaignSegment);
        }),

      delete: (campaignId: CampaignId, segmentId: SegmentId) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .delete(campaignSegment)
                .where(
                  and(
                    eq(campaignSegment.campaignId, campaignId),
                    eq(campaignSegment.segmentId, segmentId)
                  )
                )
                .returning(),
            catch: (error) =>
              new CampaignSegmentDbError({
                message: "Failed to delete campaign-segment relationship",
                cause: error,
              }),
          });

          if (result.length === 0) {
            return yield* Effect.fail(
              new CampaignSegmentNotFoundError({
                message: "Campaign-segment relationship not found",
                campaignId,
                segmentId,
              })
            );
          }
        }),

      listByCampaign: (campaignId: CampaignId) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(campaignSegment)
                .where(eq(campaignSegment.campaignId, campaignId)),
            catch: (error) =>
              new CampaignSegmentDbError({
                message: "Failed to list campaign segments",
                cause: error,
              }),
          });

          return result.map(convertToDomainCampaignSegment);
        }),

      listBySegment: (segmentId: SegmentId) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(campaignSegment)
                .where(eq(campaignSegment.segmentId, segmentId)),
            catch: (error) =>
              new CampaignSegmentDbError({
                message: "Failed to list segment campaigns",
                cause: error,
              }),
          });

          return result.map(convertToDomainCampaignSegment);
        }),
    };
  })
);
