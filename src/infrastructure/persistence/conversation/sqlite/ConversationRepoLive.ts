import { Effect, Layer } from "effect";
import { eq, desc, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  ConversationRepo,
  DbError,
} from "@/domain/tenant/conversations/service";
import { DrizzleDOClient } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { conversation } from "@/infrastructure/persistence/conversation/sqlite/schema";
import type { Conversation } from "@/domain/tenant/conversations/models";
import {
  ConversationCreationError,
  ConversationNotFoundError,
} from "@/domain/tenant/conversations/models";

// Helper function to convert database row to domain model
function mapDbRowToConversation(row: any): Conversation {
  return {
    id: row.id,
    organizationSlug: row.organizationSlug,
    campaignId: row.campaignId ?? null,
    customerPhone: row.customerPhone,
    storePhone: row.storePhone,
    status: row.status as Conversation["status"],
    lastMessageAt: row.lastMessageAt ?? null,
    createdAt: row.createdAt,
    metadata: row.metadata ?? null,
  };
}

export const ConversationRepoLive = Layer.effect(
  ConversationRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;

    return {
      get: (conversationId: string) =>
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
            catch: (error) => new DbError(error),
          });

          if (!result) {
            return null;
          }

          return mapDbRowToConversation(result);
        }),

      create: (data: Omit<Conversation, "id" | "createdAt">) =>
        Effect.gen(function* () {
          const conversationId = `conv_${nanoid()}`;
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

          const result = yield* Effect.tryPromise({
            try: async () => {
              await drizzleClient.db.insert(conversation).values(insertData);
              return insertData;
            },
            catch: (error) => {
              // Check if it's a constraint violation or other specific error
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              if (errorMessage.includes("UNIQUE constraint")) {
                return new ConversationCreationError({
                  reason:
                    "Conversation already exists for this customer and organization",
                });
              }
              return new DbError(error);
            },
          });

          if (
            result instanceof ConversationCreationError ||
            result instanceof DbError
          ) {
            return yield* Effect.fail(result);
          }

          return mapDbRowToConversation({
            ...result,
            // Ensure nullable fields are converted from undefined to null for domain consistency
            campaignId: result.campaignId ?? null,
            lastMessageAt: result.lastMessageAt ?? null,
            metadata: result.metadata ?? null,
          });
        }),

      updateStatus: (conversationId: string, status: Conversation["status"]) =>
        Effect.gen(function* () {
          const updateResult = yield* Effect.tryPromise({
            try: async () => {
              const result = await drizzleClient.db
                .update(conversation)
                .set({ status })
                .where(eq(conversation.id, conversationId))
                .returning();

              if (result.length === 0) {
                throw new ConversationNotFoundError({ conversationId });
              }

              return result[0];
            },
            catch: (error) => {
              if (error instanceof ConversationNotFoundError) {
                return error;
              }
              return new DbError(error);
            },
          });

          if (
            updateResult instanceof ConversationNotFoundError ||
            updateResult instanceof DbError
          ) {
            return yield* Effect.fail(updateResult);
          }

          return mapDbRowToConversation(updateResult);
        }),

      updateLastMessageAt: (conversationId: string, timestamp: Date) =>
        Effect.gen(function* () {
          const updateResult = yield* Effect.tryPromise({
            try: async () => {
              const result = await drizzleClient.db
                .update(conversation)
                .set({ lastMessageAt: timestamp })
                .where(eq(conversation.id, conversationId))
                .returning();

              if (result.length === 0) {
                throw new ConversationNotFoundError({ conversationId });
              }

              return result[0];
            },
            catch: (error) => {
              if (error instanceof ConversationNotFoundError) {
                return error;
              }
              return new DbError(error);
            },
          });

          if (
            updateResult instanceof ConversationNotFoundError ||
            updateResult instanceof DbError
          ) {
            return yield* Effect.fail(updateResult);
          }
        }),

      getByOrganization: (
        organizationSlug: string,
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
            catch: (error) => new DbError(error),
          });

          return result;
        }),

      getByCampaign: (
        campaignId: string,
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
            catch: (error) => new DbError(error),
          });

          return result;
        }),
    };
  })
);
