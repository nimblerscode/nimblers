import { Effect, Layer } from "effect";
import { eq, desc, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { MessageRepo, DbError } from "@/domain/tenant/conversations/service";
import { DrizzleDOClient } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { message } from "@/infrastructure/persistence/conversation/sqlite/schema";
import type {
  Message,
  GetMessagesRequest,
  MessagesResponse,
} from "@/domain/tenant/conversations/models";
import { MessageNotFoundError } from "@/domain/tenant/conversations/models";

export const MessageRepoLive = Layer.effect(
  MessageRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;

    return {
      create: (
        conversationId: string,
        data: Omit<Message, "id" | "createdAt">
      ) =>
        Effect.gen(function* () {
          const messageId = `msg_${nanoid()}`;
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
            catch: (error) => new DbError(error),
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

      get: (messageId: string) =>
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
            catch: (error) => new DbError(error),
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

      getByConversation: (
        conversationId: string,
        options: GetMessagesRequest
      ) =>
        Effect.gen(function* () {
          const limit = options.limit || 50;
          const cursor = options.cursor;
          const direction = options.direction;

          const result = yield* Effect.tryPromise({
            try: async () => {
              // Build where conditions
              const whereConditions = [];

              if (cursor) {
                whereConditions.push(gt(message.createdAt, new Date(cursor)));
              }

              if (direction) {
                whereConditions.push(eq(message.direction, direction));
              }

              const results = await drizzleClient.db
                .select()
                .from(message)
                .where(
                  whereConditions.length > 0
                    ? and(...whereConditions)
                    : undefined
                )
                .orderBy(desc(message.createdAt))
                .limit(limit + 1); // Get one extra to check if there are more

              const hasMore = results.length > limit;
              const messages = results.slice(0, limit);
              const nextCursor =
                hasMore && messages.length > 0
                  ? messages[messages.length - 1].createdAt.toISOString()
                  : null;

              return {
                messages: messages.map((msg) => ({
                  id: msg.id,
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
                  hasMore,
                  cursor: nextCursor,
                },
              };
            },
            catch: (error) => new DbError(error),
          });

          return result;
        }),

      updateStatus: (
        messageId: string,
        status: Message["status"],
        metadata?: {
          sentAt?: Date;
          deliveredAt?: Date;
          readAt?: Date;
          failedAt?: Date;
          failureReason?: string;
        }
      ) =>
        Effect.gen(function* () {
          const updateResult = yield* Effect.tryPromise({
            try: async () => {
              const updateData: any = { status };

              if (metadata?.sentAt) updateData.sentAt = metadata.sentAt;
              if (metadata?.deliveredAt)
                updateData.deliveredAt = metadata.deliveredAt;
              if (metadata?.readAt) updateData.readAt = metadata.readAt;
              if (metadata?.failedAt) updateData.failedAt = metadata.failedAt;
              if (metadata?.failureReason)
                updateData.failureReason = metadata.failureReason;

              const result = await drizzleClient.db
                .update(message)
                .set(updateData)
                .where(eq(message.id, messageId))
                .returning();

              if (result.length === 0) {
                throw new MessageNotFoundError({ messageId });
              }

              return result[0];
            },
            catch: (error) => {
              if (error instanceof MessageNotFoundError) {
                return error;
              }
              return new DbError(error);
            },
          });

          if (
            updateResult instanceof MessageNotFoundError ||
            updateResult instanceof DbError
          ) {
            return yield* Effect.fail(updateResult);
          }

          return {
            id: updateResult.id,
            direction: updateResult.direction as Message["direction"],
            content: updateResult.content,
            status: updateResult.status as Message["status"],
            messageType: updateResult.messageType,
            externalMessageId: updateResult.externalMessageId,
            sentAt: updateResult.sentAt,
            deliveredAt: updateResult.deliveredAt,
            readAt: updateResult.readAt,
            failedAt: updateResult.failedAt,
            failureReason: updateResult.failureReason,
            createdAt: updateResult.createdAt,
            metadata: updateResult.metadata,
          } as Message;
        }),

      updateExternalId: (messageId: string, externalMessageId: string) =>
        Effect.gen(function* () {
          const updateResult = yield* Effect.tryPromise({
            try: async () => {
              const result = await drizzleClient.db
                .update(message)
                .set({ externalMessageId })
                .where(eq(message.id, messageId))
                .returning();

              if (result.length === 0) {
                throw new MessageNotFoundError({ messageId });
              }

              return result[0];
            },
            catch: (error) => {
              if (error instanceof MessageNotFoundError) {
                return error;
              }
              return new DbError(error);
            },
          });

          if (
            updateResult instanceof MessageNotFoundError ||
            updateResult instanceof DbError
          ) {
            return yield* Effect.fail(updateResult);
          }
        }),
    };
  })
);
