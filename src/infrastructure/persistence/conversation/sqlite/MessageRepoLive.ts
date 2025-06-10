import { Effect, Layer } from "effect";
import { eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { MessageRepo } from "@/domain/tenant/conversations/service";
import { ConversationDrizzleDOClient } from "@/infrastructure/persistence/conversation/sqlite/drizzle";
import { message } from "@/infrastructure/persistence/conversation/sqlite/schema";
import type {
  Message,
  GetMessagesRequest,
  MessageId,
} from "@/domain/tenant/conversations/models";
import {
  MessageNotFoundError,
  MessageCreateError,
  MessagesNotFoundError,
  MessageUpdateError,
} from "@/domain/tenant/conversations/models";
import { unsafeMessageId } from "@/domain/tenant/shared/branded-types";

export const MessageRepoLive = Layer.effect(
  MessageRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* ConversationDrizzleDOClient;

    return {
      create: (data: Omit<Message, "id" | "createdAt">) =>
        Effect.gen(function* () {
          const messageId = unsafeMessageId(nanoid());
          const now = new Date();

          // Build insert data with proper null handling for Drizzle
          const insertData = {
            id: messageId,
            direction: data.direction,
            content: data.content,
            status: data.status || "pending",
            messageType: data.messageType ?? undefined,
            externalMessageId: data.externalMessageId ?? undefined,
            sentAt: data.sentAt ?? undefined,
            deliveredAt: data.deliveredAt ?? undefined,
            readAt: data.readAt ?? undefined,
            failedAt: data.failedAt ?? undefined,
            failureReason: data.failureReason ?? undefined,
            createdAt: now,
            metadata: data.metadata ?? undefined,
          } as const;

          const result = yield* Effect.tryPromise({
            try: async () => {
              await drizzleClient.db.insert(message).values(insertData);
              return insertData;
            },
            catch: (error) =>
              new MessageCreateError({
                reason: error instanceof Error ? error.message : String(error),
              }),
          });

          return {
            id: result.id,
            direction: result.direction as Message["direction"],
            content: result.content,
            status: result.status as Message["status"],
            messageType: result.messageType,
            externalMessageId: result.externalMessageId,
            sentAt: result.sentAt,
            deliveredAt: result.deliveredAt,
            readAt: result.readAt,
            failedAt: result.failedAt,
            failureReason: result.failureReason,
            createdAt: result.createdAt,
            metadata: result.metadata,
          } as Message;
        }),

      get: (messageId: MessageId) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: async () => {
              const results = await drizzleClient.db
                .select()
                .from(message)
                .where(eq(message.id, messageId))
                .limit(1);

              return results.length > 0 ? results[0] : null;
            },
            catch: (error) => new MessageNotFoundError({ messageId }),
          });

          if (!result) {
            return yield* Effect.fail(new MessageNotFoundError({ messageId }));
          }

          // Transform database result to domain model
          return {
            id: result.id,
            direction: result.direction as Message["direction"],
            content: result.content,
            status: result.status as Message["status"],
            messageType: result.messageType,
            externalMessageId: result.externalMessageId,
            sentAt: result.sentAt,
            deliveredAt: result.deliveredAt,
            readAt: result.readAt,
            failedAt: result.failedAt,
            failureReason: result.failureReason,
            createdAt: result.createdAt,
            metadata: result.metadata,
          } as Message;
        }),

      getAllMessages: (options: GetMessagesRequest) =>
        Effect.gen(function* () {
          const limit = options.limit || 50;
          const cursor = options.cursor;
          const direction = options.direction;

          const results = yield* Effect.tryPromise({
            try: async () => {
              const results = await drizzleClient.db
                .select()
                .from(message)
                .orderBy(asc(message.createdAt)) // Order by creation time for proper conversation flow
                .limit(limit);

              return results;
            },
            catch: (error) => new MessagesNotFoundError(),
          });

          return [
            {
              messages: results.map((msg) => ({
                id: unsafeMessageId(msg.id),
                direction: msg.direction as Message["direction"],
                content: msg.content,
                status: msg.status as Message["status"],
                messageType: msg.messageType,
                externalMessageId: msg.externalMessageId,
                sentAt: msg.sentAt,
                deliveredAt: msg.deliveredAt,
                readAt: msg.readAt,
                failedAt: msg.failedAt,
                failureReason: msg.failureReason,
                createdAt: msg.createdAt,
                metadata: msg.metadata,
              })) as Message[],
              pagination: {
                hasMore: false,
                cursor: cursor,
              },
            },
          ];
        }),

      updateStatus: (messageId: MessageId, status: Message["status"]) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: async () => {
              const updated = await drizzleClient.db
                .update(message)
                .set({ status })
                .where(eq(message.id, messageId))
                .returning();

              if (updated.length === 0) {
                throw new MessageUpdateError({
                  reason: "Message not found",
                  messageId,
                });
              }

              return updated[0];
            },
            catch: (error) =>
              new MessageUpdateError({
                reason: error instanceof Error ? error.message : String(error),
                messageId,
              }),
          });

          return {
            id: result.id,
            direction: result.direction as Message["direction"],
            content: result.content,
            status: result.status as Message["status"],
            messageType: result.messageType,
            externalMessageId: result.externalMessageId,
            sentAt: result.sentAt,
            deliveredAt: result.deliveredAt,
            readAt: result.readAt,
            failedAt: result.failedAt,
            failureReason: result.failureReason,
            createdAt: result.createdAt,
            metadata: result.metadata,
          } as Message;
        }),
      updateExternalId: (messageId: MessageId, externalMessageId: string) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: async () => {
              const result = await drizzleClient.db
                .update(message)
                .set({ externalMessageId })
                .where(eq(message.id, messageId))
                .returning();

              if (result.length === 0) {
                throw new MessageUpdateError({
                  reason: "Message not found",
                  messageId,
                });
              }

              return result[0];
            },
            catch: (error) =>
              new MessageUpdateError({
                reason: error instanceof Error ? error.message : String(error),
                messageId,
              }),
          });
        }),

      findByExternalId: (externalMessageId: string) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: async () => {
              const results = await drizzleClient.db
                .select()
                .from(message)
                .where(eq(message.externalMessageId, externalMessageId))
                .limit(1);

              return results.length > 0 ? results[0] : null;
            },
            catch: (error) =>
              new MessageNotFoundError({
                messageId: externalMessageId as MessageId,
              }),
          });

          if (!result) {
            return null;
          }

          // Transform database result to domain model
          return {
            id: result.id,
            direction: result.direction as Message["direction"],
            content: result.content,
            status: result.status as Message["status"],
            messageType: result.messageType,
            externalMessageId: result.externalMessageId,
            sentAt: result.sentAt,
            deliveredAt: result.deliveredAt,
            readAt: result.readAt,
            failedAt: result.failedAt,
            failureReason: result.failureReason,
            createdAt: result.createdAt,
            metadata: result.metadata,
          } as Message;
        }),
    };
  })
);
