import { Effect, Layer } from "effect";
import { desc, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  ConversationEventRepo,
  DbError,
} from "@/domain/tenant/conversations/service";
import { DrizzleDOClient } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { conversationEvent } from "./schema";
import type { ConversationEvent } from "@/domain/tenant/conversations/models";

export const ConversationEventRepoLive = Layer.effect(
  ConversationEventRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;

    return {
      create: (
        conversationId: string,
        data: Omit<ConversationEvent, "id" | "createdAt">
      ) =>
        Effect.gen(function* () {
          const eventId = `evt_${nanoid()}`;
          const now = new Date();

          const insertData = {
            id: eventId,
            eventType: data.eventType,
            description: data.description || null,
            createdAt: now,
            metadata: data.metadata || null,
          };

          const result = yield* Effect.tryPromise({
            try: async () => {
              await drizzleClient.db
                .insert(conversationEvent)
                .values(insertData);
              return insertData;
            },
            catch: (error) => new DbError(error),
          });

          return {
            id: result.id,
            eventType: result.eventType,
            description: result.description,
            createdAt: result.createdAt,
            metadata: result.metadata,
          } as ConversationEvent;
        }),

      getByConversation: (
        conversationId: string,
        options?: { limit?: number; cursor?: string }
      ) =>
        Effect.gen(function* () {
          const limit = options?.limit || 50;
          const cursor = options?.cursor;

          const result = yield* Effect.tryPromise({
            try: async () => {
              const whereConditions = [];

              if (cursor) {
                whereConditions.push(
                  gt(conversationEvent.createdAt, new Date(cursor))
                );
              }

              const results = await drizzleClient.db
                .select()
                .from(conversationEvent)
                .where(
                  whereConditions.length > 0
                    ? and(...whereConditions)
                    : undefined
                )
                .orderBy(desc(conversationEvent.createdAt))
                .limit(limit + 1);

              const hasMore = results.length > limit;
              const events = results.slice(0, limit);
              const nextCursor =
                hasMore && events.length > 0
                  ? events[events.length - 1].createdAt.toISOString()
                  : null;

              return {
                events: events.map((event) => ({
                  id: event.id,
                  eventType: event.eventType,
                  description: event.description,
                  createdAt: event.createdAt,
                  metadata: event.metadata,
                })) as ConversationEvent[],
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
