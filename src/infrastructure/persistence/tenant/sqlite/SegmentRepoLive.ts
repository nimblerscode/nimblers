import { Effect, Layer, Option } from "effect";
import { nanoid } from "nanoid";
import {
  SegmentRepo,
  SegmentRepositoryError,
  DbError,
} from "@/domain/tenant/segments/service";
import type {
  Segment,
  SegmentId,
  CreateSegmentInput,
  UpdateSegmentInput,
  ShopifySegmentId,
} from "@/domain/tenant/segments/models";
import { DrizzleDOClient } from "./drizzle";
import { segment } from "./schema";
import { eq, desc, lt, and } from "drizzle-orm";

// Type for the actual database row
type SelectSegment = typeof segment.$inferSelect;
type InsertSegment = typeof segment.$inferInsert;

const convertToDomainSegment = (row: SelectSegment): Segment => ({
  id: row.id as SegmentId,
  name: row.name,
  description: row.description ?? undefined,
  type: row.type as Segment["type"],
  status: row.status as Segment["status"],
  shopifySegmentId: row.shopifySegmentId
    ? (row.shopifySegmentId as ShopifySegmentId)
    : undefined,
  query: row.query ? JSON.parse(row.query) : undefined,
  lastSyncAt: row.lastSyncAt ? new Date(row.lastSyncAt) : undefined,
  metadata: row.metadata ? JSON.parse(row.metadata) : {},
  createdAt: new Date(row.createdAt),
  updatedAt: new Date(row.updatedAt),
});

const convertToInsertSegment = (
  data: CreateSegmentInput
): Omit<InsertSegment, "id" | "createdAt" | "updatedAt"> => ({
  name: data.name,
  description: data.description ?? null,
  type: data.type,
  status: "active", // Default status
  shopifySegmentId: data.shopifySegmentId ?? null,
  query: data.query ? JSON.stringify(data.query) : null,
  conditions: null, // Will be populated from query if needed
  lastSyncAt: undefined, // Will be set when first sync happens
  metadata: JSON.stringify(data.metadata ?? {}),
});

export const SegmentRepoLive = Layer.effect(
  SegmentRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;

    return {
      get: (segmentId: SegmentId) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(segment)
                .where(eq(segment.id, segmentId))
                .limit(1),
            catch: (error) =>
              new DbError({
                message: "Failed to fetch segment",
                cause: error,
                table: "segment",
                operation: "select",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new SegmentRepositoryError({
                  message: `Failed to get segment: ${dbError.message}`,
                  cause: dbError,
                  operation: "get",
                })
            )
          );

          return result.length > 0
            ? Option.some(convertToDomainSegment(result[0]))
            : Option.none();
        }),

      create: (data: CreateSegmentInput) =>
        Effect.gen(function* () {
          const insertData = convertToInsertSegment(data);
          const now = new Date();
          const id = nanoid();

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(segment)
                .values({
                  id,
                  ...insertData,
                  createdAt: now,
                  updatedAt: now,
                } satisfies typeof segment.$inferInsert)
                .returning(),
            catch: (error) =>
              new DbError({
                message: "Failed to create segment",
                cause: error,
                table: "segment",
                operation: "insert",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new SegmentRepositoryError({
                  message: `Failed to create segment: ${dbError.message}`,
                  cause: dbError,
                  operation: "create",
                })
            )
          );

          return convertToDomainSegment(result[0]);
        }),

      update: (segmentId: SegmentId, data: UpdateSegmentInput) =>
        Effect.gen(function* () {
          const updateData: Partial<InsertSegment> = {
            ...(data.name && { name: data.name }),
            ...(data.description !== undefined && {
              description: data.description,
            }),
            ...(data.status && { status: data.status }),
            ...(data.shopifySegmentId !== undefined && {
              shopifySegmentId: data.shopifySegmentId,
            }),
            ...(data.query && { query: JSON.stringify(data.query) }),
            ...(data.metadata && { metadata: JSON.stringify(data.metadata) }),
            updatedAt: new Date(),
          };

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .update(segment)
                .set(updateData)
                .where(eq(segment.id, segmentId))
                .returning(),
            catch: (error) =>
              new DbError({
                message: "Failed to update segment",
                cause: error,
                table: "segment",
                operation: "update",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new SegmentRepositoryError({
                  message: `Failed to update segment: ${dbError.message}`,
                  cause: dbError,
                  operation: "update",
                })
            )
          );

          if (result.length === 0) {
            return yield* Effect.fail(
              new SegmentRepositoryError({
                message: "Segment not found",
                operation: "update",
              })
            );
          }

          return convertToDomainSegment(result[0]);
        }),

      delete: (segmentId: SegmentId) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db.delete(segment).where(eq(segment.id, segmentId)),
            catch: (error) =>
              new DbError({
                message: "Failed to delete segment",
                cause: error,
                table: "segment",
                operation: "delete",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new SegmentRepositoryError({
                  message: `Failed to delete segment: ${dbError.message}`,
                  cause: dbError,
                  operation: "delete",
                })
            )
          );
        }),

      list: (options = {}) =>
        Effect.gen(function* () {
          const { limit = 50, cursor, type, status } = options;

          const baseQuery = drizzleClient.db
            .select()
            .from(segment)
            .orderBy(desc(segment.createdAt))
            .limit(limit + 1);

          const conditions = [];
          if (type) {
            conditions.push(eq(segment.type, type as Segment["type"]));
          }
          if (status) {
            conditions.push(eq(segment.status, status as Segment["status"]));
          }
          if (cursor) {
            const cursorDate = new Date(Number.parseInt(cursor, 10));
            conditions.push(lt(segment.createdAt, cursorDate));
          }

          const query =
            conditions.length > 0
              ? baseQuery.where(and(...conditions))
              : baseQuery;

          const result = yield* Effect.tryPromise({
            try: () => query,
            catch: (error) =>
              new DbError({
                message: "Failed to list segments",
                cause: error,
                table: "segment",
                operation: "select",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new SegmentRepositoryError({
                  message: `Failed to list segments: ${dbError.message}`,
                  cause: dbError,
                  operation: "list",
                })
            )
          );

          const hasMore = result.length > limit;
          const segmentList = hasMore ? result.slice(0, -1) : result;
          const nextCursor = hasMore
            ? Number(segmentList[segmentList.length - 1].createdAt).toString()
            : null;

          return {
            segments: segmentList.map(convertToDomainSegment),
            hasMore,
            cursor: nextCursor,
          };
        }),

      addUsers: (segmentId: SegmentId, userIds: string[]) =>
        Effect.gen(function* () {
          // This would typically involve a separate segment_users table
          // For now, we'll just update the segment's lastSyncAt
          yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .update(segment)
                .set({ lastSyncAt: new Date() })
                .where(eq(segment.id, segmentId)),
            catch: (error) =>
              new DbError({
                message: "Failed to add users to segment",
                cause: error,
                table: "segment",
                operation: "update",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new SegmentRepositoryError({
                  message: `Failed to add users to segment: ${dbError.message}`,
                  cause: dbError,
                  operation: "addUsers",
                })
            )
          );
        }),

      removeUsers: (segmentId: SegmentId, userIds: string[]) =>
        Effect.gen(function* () {
          // This would typically involve a separate segment_users table
          // For now, we'll just update the segment's lastSyncAt
          yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .update(segment)
                .set({ lastSyncAt: new Date() })
                .where(eq(segment.id, segmentId)),
            catch: (error) =>
              new DbError({
                message: "Failed to remove users from segment",
                cause: error,
                table: "segment",
                operation: "update",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new SegmentRepositoryError({
                  message: `Failed to remove users from segment: ${dbError.message}`,
                  cause: dbError,
                  operation: "removeUsers",
                })
            )
          );
        }),

      getUsersInSegment: (segmentId: SegmentId, options = {}) =>
        Effect.succeed({
          userIds: [],
          hasMore: false,
          cursor: null,
        }),

      updateStatus: (segmentId: SegmentId, status: Segment["status"]) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .update(segment)
                .set({
                  status,
                  updatedAt: new Date(),
                })
                .where(eq(segment.id, segmentId))
                .returning(),
            catch: (error) =>
              new DbError({
                message: "Failed to update segment status",
                cause: error,
                table: "segment",
                operation: "update",
              }),
          }).pipe(
            Effect.mapError(
              (dbError) =>
                new SegmentRepositoryError({
                  message: `Failed to update segment status: ${dbError.message}`,
                  cause: dbError,
                  operation: "updateStatus",
                })
            )
          );

          if (result.length === 0) {
            return yield* Effect.fail(
              new SegmentRepositoryError({
                message: "Segment not found",
                operation: "updateStatus",
              })
            );
          }

          return convertToDomainSegment(result[0]);
        }),
    };
  })
);
