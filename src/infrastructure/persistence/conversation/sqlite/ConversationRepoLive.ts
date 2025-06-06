import { Effect, Layer } from "effect";
import { eq, desc, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ConversationRepo } from "@/domain/tenant/conversations/service";
import { ConversationDrizzleDOClient } from "@/infrastructure/persistence/conversation/sqlite/drizzle";
import { conversation } from "@/infrastructure/persistence/conversation/sqlite/schema";
import type {
  Conversation,
  ConversationId,
  OrganizationSlug,
} from "@/domain/tenant/conversations/models";
import {
  ConversationCreationError,
  ConversationNotFoundError,
  ConversationUpdateError,
} from "@/domain/tenant/conversations/models";
import {
  unsafeConversationId,
  unsafeOrganizationSlug,
  unsafeCampaignId,
  unsafePhoneNumber,
  type CampaignId,
} from "@/domain/tenant/shared/branded-types";

// Helper function to convert database row to domain model
function mapDbRowToConversation(row: any): Conversation {
  return {
    id: unsafeConversationId(row.id),
    organizationSlug: unsafeOrganizationSlug(row.organizationSlug),
    campaignId: row.campaignId ? unsafeCampaignId(row.campaignId) : null,
    customerPhone: unsafePhoneNumber(row.customerPhone),
    storePhone: unsafePhoneNumber(row.storePhone),
    status: row.status as Conversation["status"],
    lastMessageAt: row.lastMessageAt ? new Date(row.lastMessageAt) : null,
    createdAt: new Date(row.createdAt),
    metadata: row.metadata ?? null,
  };
}

export const ConversationRepoLive = Layer.effect(
  ConversationRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* ConversationDrizzleDOClient;

    return {
      get: (conversationId: ConversationId) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: async () => {
              const results = await drizzleClient.db
                .select()
                .from(conversation)
                .where(eq(conversation.id, conversationId))
                .limit(1);

              return results.length > 0 ? results[0] : null;
            },
            catch: (error) => new ConversationNotFoundError({ conversationId }),
          });

          if (!result) {
            return yield* Effect.fail(
              new ConversationNotFoundError({ conversationId })
            );
          }

          return mapDbRowToConversation(result);
        }),

      create: (
        data: Omit<Conversation, "createdAt"> & { id?: ConversationId }
      ) =>
        Effect.gen(function* () {
          const conversationId = data.id ?? nanoid();
          const now = new Date();

          // Build insert data with proper null handling for Drizzle
          const insertData = {
            id: conversationId,
            organizationSlug: data.organizationSlug,
            campaignId: data.campaignId ?? undefined,
            customerPhone: data.customerPhone,
            storePhone: data.storePhone,
            status: data.status || "active",
            lastMessageAt: data.lastMessageAt ?? undefined,
            createdAt: now,
            metadata: data.metadata ?? undefined,
          } as const;

          const insertResult = yield* Effect.tryPromise({
            try: async () => {
              await drizzleClient.db.insert(conversation).values(insertData);
              // After insert, fetch the created conversation to get all computed values
              const results = await drizzleClient.db
                .select()
                .from(conversation)
                .where(eq(conversation.id, conversationId))
                .limit(1);

              if (results.length > 0) {
                console.log("Repository: Found conversation after insert:", {
                  id: results[0].id,
                  lastMessageAt: results[0].lastMessageAt,
                  createdAt: results[0].createdAt,
                  lastMessageAtType: typeof results[0].lastMessageAt,
                  createdAtType: typeof results[0].createdAt,
                });
              } else {
                console.log("Repository: No conversation found after insert");
              }

              return results.length > 0 ? results[0] : null;
            },
            catch: (error) => {
              console.log("Repository: Error in create operation:", error);
              // Check if it's a constraint violation or other specific error
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              if (errorMessage.includes("UNIQUE constraint")) {
                return new ConversationCreationError({
                  reason:
                    "Conversation already exists for this customer and organization",
                });
              }
              return new ConversationCreationError({
                reason: `Database error: ${errorMessage}`,
              });
            },
          });

          if (insertResult instanceof ConversationCreationError) {
            return yield* Effect.fail(insertResult);
          }

          if (!insertResult) {
            console.log("Repository: No insert result returned");
            return yield* Effect.fail(
              new ConversationCreationError({
                reason: "Failed to retrieve created conversation",
              })
            );
          }

          console.log("Repository: About to map conversation");
          const mappedResult = mapDbRowToConversation(insertResult);
          console.log("Repository: Mapped conversation successfully:", {
            id: mappedResult.id,
            lastMessageAt: mappedResult.lastMessageAt,
            createdAt: mappedResult.createdAt,
          });
          return mappedResult;
        }),

      updateStatus: (
        conversationId: ConversationId,
        status: Conversation["status"]
      ) =>
        Effect.gen(function* () {
          const updateResult = yield* Effect.tryPromise({
            try: async () => {
              const result = await drizzleClient.db
                .update(conversation)
                .set({ status })
                .where(eq(conversation.id, conversationId))
                .returning();

              if (result.length === 0) {
                throw new ConversationNotFoundError({
                  conversationId,
                });
              }

              return result[0];
            },
            catch: (error) => {
              if (error instanceof ConversationNotFoundError) {
                return new ConversationUpdateError({
                  reason: `Conversation not found: ${conversationId}`,
                  conversationId,
                });
              }
              const message =
                error instanceof Error ? error.message : String(error);
              return new ConversationUpdateError({
                reason: `Database error: ${message}`,
                conversationId,
              });
            },
          });

          if (updateResult instanceof ConversationUpdateError) {
            return yield* Effect.fail(updateResult);
          }

          return mapDbRowToConversation(updateResult);
        }),

      updateLastMessageAt: (conversationId: ConversationId, timestamp: Date) =>
        Effect.gen(function* () {
          const updateResult = yield* Effect.tryPromise({
            try: async () => {
              const result = await drizzleClient.db
                .update(conversation)
                .set({ lastMessageAt: timestamp })
                .where(eq(conversation.id, conversationId))
                .returning();

              if (result.length === 0) {
                throw new ConversationNotFoundError({
                  conversationId,
                });
              }

              return result[0];
            },
            catch: (error) => {
              if (error instanceof ConversationNotFoundError) {
                return new ConversationUpdateError({
                  reason: `Conversation not found: ${conversationId}`,
                  conversationId,
                });
              }
              const message =
                error instanceof Error ? error.message : String(error);
              return new ConversationUpdateError({
                reason: `Database error: ${message}`,
                conversationId,
              });
            },
          });

          if (updateResult instanceof ConversationUpdateError) {
            return yield* Effect.fail(updateResult);
          }
        }),

      getByOrganization: (
        organizationSlug: OrganizationSlug,
        options?: { limit?: number; cursor?: string }
      ) =>
        Effect.gen(function* () {
          const limit = options?.limit || 50;
          const cursor = options?.cursor;

          const result = yield* Effect.tryPromise({
            try: async () => {
              // Build where conditions
              const whereConditions = [
                eq(conversation.organizationSlug, organizationSlug),
              ];

              if (cursor) {
                whereConditions.push(
                  gt(conversation.createdAt, new Date(cursor))
                );
              }

              const results = await drizzleClient.db
                .select()
                .from(conversation)
                .where(and(...whereConditions))
                .orderBy(desc(conversation.createdAt))
                .limit(limit + 1); // Get one extra to check if there are more

              const hasMore = results.length > limit;
              const conversations = results.slice(0, limit);
              const nextCursor =
                hasMore && conversations.length > 0
                  ? conversations[
                      conversations.length - 1
                    ].createdAt.toISOString()
                  : null;

              return {
                conversations: conversations.map(mapDbRowToConversation),
                hasMore,
                cursor: nextCursor,
              };
            },
            catch: (error) => {
              const message =
                error instanceof Error ? error.message : String(error);
              throw new Error(`Database error: ${message}`);
            },
          });

          return result;
        }),

      getByCampaign: (
        campaignId: CampaignId,
        options?: { limit?: number; cursor?: string }
      ) =>
        Effect.gen(function* () {
          const limit = options?.limit || 50;
          const cursor = options?.cursor;

          const result = yield* Effect.tryPromise({
            try: async () => {
              // Build where conditions
              const whereConditions = [eq(conversation.campaignId, campaignId)];

              if (cursor) {
                whereConditions.push(
                  gt(conversation.createdAt, new Date(cursor))
                );
              }

              const results = await drizzleClient.db
                .select()
                .from(conversation)
                .where(and(...whereConditions))
                .orderBy(desc(conversation.createdAt))
                .limit(limit + 1); // Get one extra to check if there are more

              const hasMore = results.length > limit;
              const conversations = results.slice(0, limit);
              const nextCursor =
                hasMore && conversations.length > 0
                  ? conversations[
                      conversations.length - 1
                    ].createdAt.toISOString()
                  : null;

              return {
                conversations: conversations.map(mapDbRowToConversation),
                hasMore,
                cursor: nextCursor,
              };
            },
            catch: (error) => {
              const message =
                error instanceof Error ? error.message : String(error);
              throw new Error(`Database error: ${message}`);
            },
          });

          return result;
        }),
    };
  })
);
