import { Effect, Layer, Option } from "effect";
import {
  CampaignRepo,
  CampaignRepositoryError,
  DbError,
} from "@/domain/tenant/campaigns/service";
import type {
  Campaign,
  CampaignId,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "@/domain/tenant/campaigns/models";
import { DrizzleDOClient } from "./drizzle";
import { campaign } from "./schema";
import { eq, desc, sql, lt, and } from "drizzle-orm";
import { unsafeTimezone } from "@/domain/tenant/shared/branded-types";

// Type for the actual database row
type SelectCampaign = typeof campaign.$inferSelect;
type InsertCampaign = typeof campaign.$inferInsert;

const convertToDomainCampaign = (row: SelectCampaign): Campaign => ({
  id: row.id as CampaignId,
  name: row.name,
  description: row.description ?? undefined,
  campaignType: row.campaignType as Campaign["campaignType"],
  status: row.status as Campaign["status"],
  schedule: {
    scheduledAt: row.scheduledAt ? new Date(row.scheduledAt) : undefined,
    timezone: unsafeTimezone(row.timezone || "UTC"),
    startedAt: row.startedAt ? new Date(row.startedAt) : undefined,
    completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
  },
  segmentIds: row.segmentIds ? JSON.parse(row.segmentIds) : [],
  execution: {
    campaignSentAt: row.campaignSentAt
      ? new Date(row.campaignSentAt)
      : undefined,
    estimatedDeliveryTime: row.estimatedDeliveryTime
      ? new Date(row.estimatedDeliveryTime)
      : undefined,
  },
  settings: undefined, // Not stored in current schema
  metadata: row.metadata ? JSON.parse(row.metadata) : {},
  createdAt: new Date(row.createdAt),
  updatedAt: new Date(row.updatedAt),
});

const convertToInsertCampaign = (
  data: CreateCampaignInput
): Omit<InsertCampaign, "id" | "createdAt" | "updatedAt"> => ({
  name: data.name,
  description: data.description ?? null,
  campaignType: data.campaignType,
  status: "draft",
  scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
  timezone: data.timezone,
  segmentIds: JSON.stringify(data.segmentIds),
  campaignSentAt: undefined,
  estimatedDeliveryTime: undefined,
  startedAt: undefined,
  completedAt: undefined,
  metadata: JSON.stringify(data.metadata ?? {}),
});

export const CampaignRepoLive = Layer.effect(
  CampaignRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;

    return {
      get: (campaignId: CampaignId) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(campaign)
                .where(eq(campaign.id, campaignId))
                .limit(1),
            catch: (error) =>
              new DbError({
                message: "Failed to fetch campaign",
                cause: error,
                table: "campaign",
                operation: "select",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new CampaignRepositoryError({
                  message: `Failed to get campaign: ${dbError.message}`,
                  cause: dbError,
                  operation: "get",
                })
            )
          );

          return result.length > 0
            ? Option.some(convertToDomainCampaign(result[0]))
            : Option.none();
        }),

      create: (data: CreateCampaignInput) =>
        Effect.gen(function* () {
          const insertData = convertToInsertCampaign(data);
          const now = new Date();
          const id = crypto.randomUUID();

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(campaign)
                .values({
                  id,
                  ...insertData,
                  createdAt: now,
                  updatedAt: now,
                } satisfies typeof campaign.$inferInsert)
                .returning(),
            catch: (error) =>
              new DbError({
                message: "Failed to create campaign",
                cause: error,
                table: "campaign",
                operation: "insert",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new CampaignRepositoryError({
                  message: `Failed to create campaign: ${dbError.message}`,
                  cause: dbError,
                  operation: "create",
                })
            )
          );

          return convertToDomainCampaign(result[0]);
        }),

      update: (campaignId: CampaignId, data: UpdateCampaignInput) =>
        Effect.gen(function* () {
          const updateData: Partial<InsertCampaign> = {
            ...(data.name && { name: data.name }),
            ...(data.description !== undefined && {
              description: data.description,
            }),
            ...(data.status && { status: data.status }),
            ...(data.scheduledAt !== undefined && {
              scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
            }),
            ...(data.timezone && { timezone: data.timezone }),
            ...(data.segmentIds && {
              segmentIds: JSON.stringify(data.segmentIds),
            }),
            ...(data.metadata && { metadata: JSON.stringify(data.metadata) }),
            updatedAt: new Date(),
          };

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .update(campaign)
                .set(updateData)
                .where(eq(campaign.id, campaignId))
                .returning(),
            catch: (error) =>
              new DbError({
                message: "Failed to update campaign",
                cause: error,
                table: "campaign",
                operation: "update",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new CampaignRepositoryError({
                  message: `Failed to update campaign: ${dbError.message}`,
                  cause: dbError,
                  operation: "update",
                })
            )
          );

          if (result.length === 0) {
            return yield* Effect.fail(
              new CampaignRepositoryError({
                message: "Campaign not found",
                operation: "update",
              })
            );
          }

          return convertToDomainCampaign(result[0]);
        }),

      delete: (campaignId: CampaignId) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .delete(campaign)
                .where(eq(campaign.id, campaignId)),
            catch: (error) =>
              new DbError({
                message: "Failed to delete campaign",
                cause: error,
                table: "campaign",
                operation: "delete",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new CampaignRepositoryError({
                  message: `Failed to delete campaign: ${dbError.message}`,
                  cause: dbError,
                  operation: "delete",
                })
            )
          );
        }),

      list: (options = {}) =>
        Effect.gen(function* () {
          const { limit = 50, cursor, status } = options;

          const baseQuery = drizzleClient.db
            .select()
            .from(campaign)
            .orderBy(desc(campaign.createdAt))
            .limit(limit + 1); // Get one extra to check for more

          // Build where conditions
          const conditions = [];
          if (status) {
            conditions.push(eq(campaign.status, status as Campaign["status"]));
          }
          if (cursor) {
            const cursorDate = new Date(Number.parseInt(cursor, 10));
            conditions.push(lt(campaign.createdAt, cursorDate));
          }

          const query =
            conditions.length > 0
              ? baseQuery.where(and(...conditions))
              : baseQuery;

          const result = yield* Effect.tryPromise({
            try: () => query,
            catch: (error) =>
              new DbError({
                message: "Failed to list campaigns",
                cause: error,
                table: "campaign",
                operation: "select",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new CampaignRepositoryError({
                  message: `Failed to list campaigns: ${dbError.message}`,
                  cause: dbError,
                  operation: "list",
                })
            )
          );

          const hasMore = result.length > limit;
          const campaignList = hasMore ? result.slice(0, -1) : result;
          const nextCursor = hasMore
            ? Number(campaignList[campaignList.length - 1].createdAt).toString()
            : null;

          return {
            campaigns: campaignList.map(convertToDomainCampaign),
            hasMore,
            cursor: nextCursor,
          };
        }),

      getBySegment: (segmentId: string, options = {}) =>
        Effect.gen(function* () {
          const { limit = 50, cursor } = options;

          const segmentCondition = sql`JSON_EXTRACT(${
            campaign.segmentIds
          }, '$') LIKE ${"%" + segmentId + "%"}`;

          const conditions = [segmentCondition];
          if (cursor) {
            const cursorDate = new Date(Number.parseInt(cursor, 10));
            conditions.push(lt(campaign.createdAt, cursorDate));
          }

          const query = drizzleClient.db
            .select()
            .from(campaign)
            .where(and(...conditions))
            .orderBy(desc(campaign.createdAt))
            .limit(limit + 1);

          const result = yield* Effect.tryPromise({
            try: () => query,
            catch: (error) =>
              new DbError({
                message: "Failed to get campaigns by segment",
                cause: error,
                table: "campaign",
                operation: "select",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new CampaignRepositoryError({
                  message: `Failed to get campaigns by segment: ${dbError.message}`,
                  cause: dbError,
                  operation: "getBySegment",
                })
            )
          );

          const hasMore = result.length > limit;
          const campaignList = hasMore ? result.slice(0, -1) : result;
          const nextCursor = hasMore
            ? Number(campaignList[campaignList.length - 1].createdAt).toString()
            : null;

          return {
            campaigns: campaignList.map(convertToDomainCampaign),
            hasMore,
            cursor: nextCursor,
          };
        }),

      updateStatus: (campaignId: CampaignId, status: Campaign["status"]) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .update(campaign)
                .set({
                  status,
                  updatedAt: new Date(),
                })
                .where(eq(campaign.id, campaignId))
                .returning(),
            catch: (error) =>
              new DbError({
                message: "Failed to update campaign status",
                cause: error,
                table: "campaign",
                operation: "update",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new CampaignRepositoryError({
                  message: `Failed to update campaign status: ${dbError.message}`,
                  cause: dbError,
                  operation: "updateStatus",
                })
            )
          );

          if (result.length === 0) {
            return yield* Effect.fail(
              new CampaignRepositoryError({
                message: "Campaign not found",
                operation: "updateStatus",
              })
            );
          }

          return convertToDomainCampaign(result[0]);
        }),
    };
  })
);
