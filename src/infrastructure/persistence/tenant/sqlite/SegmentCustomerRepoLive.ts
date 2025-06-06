import { Effect, Layer } from "effect";
import { nanoid } from "nanoid";
import { SegmentCustomerRepo } from "@/domain/tenant/segment-customers/service";
import type {
  SegmentCustomer,
  SegmentCustomerId,
  AddCustomerToSegmentInput,
  RemoveCustomerFromSegmentInput,
  ListSegmentCustomersInput,
} from "@/domain/tenant/segment-customers/models";
import {
  SegmentCustomerNotFoundError,
  SegmentCustomerDbError,
} from "@/domain/tenant/segment-customers/models";
import { DrizzleDOClient } from "./drizzle";
import { segmentCustomer } from "./schema";
import { eq, and, desc } from "drizzle-orm";

// Type for the actual database row
type SelectSegmentCustomer = typeof segmentCustomer.$inferSelect;
type InsertSegmentCustomer = typeof segmentCustomer.$inferInsert;

const convertToDomainSegmentCustomer = (
  row: SelectSegmentCustomer
): SegmentCustomer => ({
  id: row.id as SegmentCustomerId,
  segmentId: row.segmentId as any, // Cast to branded type
  customerId: row.customerId as any, // Cast to branded type
  addedBy: row.addedBy || undefined, // Convert null to undefined
  source: row.source as SegmentCustomer["source"],
  addedAt: new Date(row.addedAt),
  qualificationMetadata: row.qualificationMetadata
    ? JSON.parse(row.qualificationMetadata)
    : {},
});

const convertToInsertSegmentCustomer = (
  data: AddCustomerToSegmentInput,
  addedBy: string
): Omit<InsertSegmentCustomer, "id" | "addedAt"> => ({
  segmentId: data.segmentId,
  customerId: data.customerId,
  addedBy,
  source: data.source || "manual",
  qualificationMetadata: JSON.stringify(data.qualificationMetadata ?? {}),
});

export const SegmentCustomerRepoLive = Layer.effect(
  SegmentCustomerRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;

    return {
      addCustomerToSegment: (data: AddCustomerToSegmentInput) =>
        Effect.gen(function* () {
          // Check for duplicate relationship
          const existingRelation = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(segmentCustomer)
                .where(
                  and(
                    eq(segmentCustomer.segmentId, data.segmentId),
                    eq(segmentCustomer.customerId, data.customerId)
                  )
                )
                .limit(1),
            catch: (error) =>
              new SegmentCustomerDbError({
                message:
                  "Failed to check existing segment-customer relationship",
                cause: error,
              }),
          });

          if (existingRelation.length > 0) {
            return yield* Effect.fail(
              new SegmentCustomerDbError({
                message: "Customer is already in this segment",
              })
            );
          }

          const insertData = convertToInsertSegmentCustomer(
            data,
            data.addedBy || "system"
          );
          const now = new Date();
          const id = nanoid();

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(segmentCustomer)
                .values({
                  id,
                  ...insertData,
                  addedAt: now,
                } satisfies typeof segmentCustomer.$inferInsert)
                .returning(),
            catch: (error) =>
              new SegmentCustomerDbError({
                message: "Failed to add customer to segment",
                cause: error,
              }),
          });

          return convertToDomainSegmentCustomer(result[0]);
        }),

      removeCustomerFromSegment: (data: RemoveCustomerFromSegmentInput) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .delete(segmentCustomer)
                .where(
                  and(
                    eq(segmentCustomer.segmentId, data.segmentId),
                    eq(segmentCustomer.customerId, data.customerId)
                  )
                )
                .returning(),
            catch: (error) =>
              new SegmentCustomerDbError({
                message: "Failed to remove customer from segment",
                cause: error,
              }),
          });

          if (result.length === 0) {
            return yield* Effect.fail(
              new SegmentCustomerNotFoundError({
                message: "Customer not found in segment",
                segmentId: data.segmentId,
                customerId: data.customerId,
              })
            );
          }
        }),

      listSegmentCustomers: (params: ListSegmentCustomersInput) =>
        Effect.gen(function* () {
          const baseQuery = drizzleClient.db
            .select()
            .from(segmentCustomer)
            .where(eq(segmentCustomer.segmentId, params.segmentId))
            .orderBy(desc(segmentCustomer.addedAt));

          // Build the final query with limit and offset
          const result = yield* Effect.tryPromise({
            try: async () => {
              let query = baseQuery;

              if (params.limit) {
                query = query.limit(params.limit) as any;
              }

              if (params.offset) {
                query = query.offset(params.offset) as any;
              }

              return await query;
            },
            catch: (error) =>
              new SegmentCustomerDbError({
                message: "Failed to list segment customers",
                cause: error,
              }),
          });

          return result.map(convertToDomainSegmentCustomer);
        }),

      listCustomerSegments: (customerId: string) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(segmentCustomer)
                .where(eq(segmentCustomer.customerId, customerId))
                .orderBy(desc(segmentCustomer.addedAt)),
            catch: (error) =>
              new SegmentCustomerDbError({
                message: "Failed to get customer segments",
                cause: error,
              }),
          });

          return result.map(convertToDomainSegmentCustomer);
        }),

      isCustomerInSegment: (segmentId: string, customerId: string) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(segmentCustomer)
                .where(
                  and(
                    eq(segmentCustomer.segmentId, segmentId),
                    eq(segmentCustomer.customerId, customerId)
                  )
                )
                .limit(1),
            catch: (error) =>
              new SegmentCustomerDbError({
                message: "Failed to check if customer is in segment",
                cause: error,
              }),
          });

          return result.length > 0;
        }),

      getSegmentCustomerCount: (segmentId: string) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select({ count: segmentCustomer.id })
                .from(segmentCustomer)
                .where(eq(segmentCustomer.segmentId, segmentId)),
            catch: (error) =>
              new SegmentCustomerDbError({
                message: "Failed to count segment customers",
                cause: error,
              }),
          });

          return result.length;
        }),

      bulkAddCustomersToSegment: (
        segmentId: string,
        customerIds: string[],
        addedBy?: string,
        source?: string
      ) =>
        Effect.gen(function* () {
          const now = new Date();
          const insertData = customerIds.map((customerId) => ({
            id: nanoid(),
            segmentId,
            customerId,
            addedBy: addedBy || "system",
            source: source || "manual",
            addedAt: now,
            qualificationMetadata: "{}",
          }));

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(segmentCustomer)
                .values(insertData)
                .onConflictDoNothing()
                .returning(),
            catch: (error) =>
              new SegmentCustomerDbError({
                message: "Failed to bulk add customers to segment",
                cause: error,
              }),
          });

          return result.map(convertToDomainSegmentCustomer);
        }),

      bulkRemoveCustomersFromSegment: (
        segmentId: string,
        customerIds: string[]
      ) =>
        Effect.gen(function* () {
          yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db.delete(segmentCustomer).where(
                and(
                  eq(segmentCustomer.segmentId, segmentId)
                  // TODO: Use proper 'in' operator when available
                  // For now, we'll handle one at a time in the use case layer
                )
              ),
            catch: (error) =>
              new SegmentCustomerDbError({
                message: "Failed to bulk remove customers from segment",
                cause: error,
              }),
          });
        }),
    };
  })
);
