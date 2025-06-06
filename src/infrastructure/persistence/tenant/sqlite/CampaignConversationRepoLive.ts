import { Effect, Layer } from "effect";
import { nanoid } from "nanoid";
import {
  CampaignConversationRepo,
  CampaignConversationDbError,
} from "@/domain/tenant/campaigns/conversation-service";
import type {
  CampaignConversation,
  CreateCampaignConversationInput,
  UpdateCampaignConversationInput,
  ListCampaignConversationsInput,
  CampaignId,
  ConversationId,
} from "@/domain/tenant/campaigns/models";
import { DrizzleDOClient } from "./drizzle";
import { campaignConversation } from "./schema";
import { eq, and, desc } from "drizzle-orm";

// Type for the actual database row
type SelectCampaignConversation = typeof campaignConversation.$inferSelect;
type InsertCampaignConversation = typeof campaignConversation.$inferInsert;

const convertToDomainCampaignConversation = (
  row: SelectCampaignConversation
): CampaignConversation => ({
  id: row.id,
  campaignId: row.campaignId as CampaignId,
  conversationId: row.conversationId as ConversationId,
  customerPhone: row.customerPhone as any, // Cast to PhoneNumber branded type
  conversationStatus: "active" as any, // Default status, this is managed in conversation DO
  lastMessageAt: undefined, // This is synced from conversation DO
  messageCount: undefined, // This is synced from conversation DO
  createdAt: new Date(row.createdAt),
  updatedAt: new Date(row.createdAt), // Use createdAt as updated since it's not tracked in registry
  metadata: row.metadata ? JSON.parse(row.metadata) : {},
});

const convertToInsertCampaignConversation = (
  data: CreateCampaignConversationInput
): Omit<InsertCampaignConversation, "id" | "createdAt"> => ({
  campaignId: data.campaignId,
  conversationId: data.conversationId,
  customerPhone: data.customerPhone,
  metadata: JSON.stringify(data.metadata ?? {}),
});

export const CampaignConversationRepoLive = Layer.effect(
  CampaignConversationRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;

    return {
      create: (data: CreateCampaignConversationInput) =>
        Effect.gen(function* () {
          const insertData = convertToInsertCampaignConversation(data);
          const now = new Date();
          const id = nanoid();

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(campaignConversation)
                .values({
                  id,
                  ...insertData,
                  createdAt: now,
                } satisfies typeof campaignConversation.$inferInsert)
                .returning(),
            catch: (error) =>
              new CampaignConversationDbError({
                message: "Failed to create campaign conversation",
                cause: error,
                table: "campaign_conversation",
                operation: "insert",
              }),
          });

          return convertToDomainCampaignConversation(result[0]);
        }),

      findById: (id: string) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(campaignConversation)
                .where(eq(campaignConversation.id, id))
                .limit(1),
            catch: (error) =>
              new CampaignConversationDbError({
                message: "Failed to find campaign conversation",
                cause: error,
                table: "campaign_conversation",
                operation: "select",
              }),
          });

          return result.length > 0
            ? convertToDomainCampaignConversation(result[0])
            : null;
        }),

      findByCampaignAndConversation: (
        campaignId: CampaignId,
        conversationId: ConversationId
      ) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(campaignConversation)
                .where(
                  and(
                    eq(campaignConversation.campaignId, campaignId),
                    eq(campaignConversation.conversationId, conversationId)
                  )
                )
                .limit(1),
            catch: (error) =>
              new CampaignConversationDbError({
                message: "Failed to find campaign conversation",
                cause: error,
                table: "campaign_conversation",
                operation: "select",
              }),
          });

          return result.length > 0
            ? convertToDomainCampaignConversation(result[0])
            : null;
        }),

      listByCampaign: (params: ListCampaignConversationsInput) =>
        Effect.gen(function* () {
          let query = drizzleClient.db
            .select()
            .from(campaignConversation)
            .where(eq(campaignConversation.campaignId, params.campaignId))
            .orderBy(desc(campaignConversation.createdAt));

          // Apply filters
          if (params.limit) {
            query = query.limit(params.limit) as any;
          }

          if (params.offset) {
            query = query.offset(params.offset) as any;
          }

          const result = yield* Effect.tryPromise({
            try: () => query,
            catch: (error) =>
              new CampaignConversationDbError({
                message: "Failed to list campaign conversations",
                cause: error,
                table: "campaign_conversation",
                operation: "select",
              }),
          });

          return result.map(convertToDomainCampaignConversation);
        }),

      update: (id: string, data: UpdateCampaignConversationInput) =>
        Effect.gen(function* () {
          const updateData: Partial<InsertCampaignConversation> = {};

          if (data.metadata !== undefined) {
            updateData.metadata = JSON.stringify(data.metadata);
          }

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .update(campaignConversation)
                .set(updateData)
                .where(eq(campaignConversation.id, id))
                .returning(),
            catch: (error) =>
              new CampaignConversationDbError({
                message: "Failed to update campaign conversation",
                cause: error,
                table: "campaign_conversation",
                operation: "update",
              }),
          });

          if (result.length === 0) {
            return yield* Effect.fail(
              new CampaignConversationDbError({
                message: "Campaign conversation not found",
                table: "campaign_conversation",
                operation: "update",
              })
            );
          }

          return convertToDomainCampaignConversation(result[0]);
        }),

      delete: (id: string) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .delete(campaignConversation)
                .where(eq(campaignConversation.id, id)),
            catch: (error) =>
              new CampaignConversationDbError({
                message: "Failed to delete campaign conversation",
                cause: error,
                table: "campaign_conversation",
                operation: "delete",
              }),
          });
        }),

      bulkCreate: (inputs: CreateCampaignConversationInput[]) =>
        Effect.gen(function* () {
          const now = new Date();
          const insertData = inputs.map((input) => ({
            id: nanoid(),
            ...convertToInsertCampaignConversation(input),
            createdAt: now,
          }));

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(campaignConversation)
                .values(insertData)
                .returning(),
            catch: (error) =>
              new CampaignConversationDbError({
                message: "Failed to bulk create campaign conversations",
                cause: error,
                table: "campaign_conversation",
                operation: "bulk_insert",
              }),
          });

          return result.map(convertToDomainCampaignConversation);
        }),
    };
  })
);
