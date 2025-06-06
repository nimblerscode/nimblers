import { Effect, Layer, Option } from "effect";
import {
  SegmentUseCase,
  SegmentUseCaseError,
  SegmentRepo,
  SegmentRepositoryError,
} from "@/domain/tenant/segments/service";
import type {
  SegmentId,
  CreateSegmentInput,
  UpdateSegmentInput,
  SegmentSyncInput,
  SegmentAnalytics,
} from "@/domain/tenant/segments/models";

export const SegmentUseCaseLive = (doId: DurableObjectId) =>
  Layer.effect(
    SegmentUseCase,
    Effect.gen(function* () {
      const segmentRepo = yield* SegmentRepo;

      // Helper function to map repository errors to use case errors
      const mapRepositoryError = (
        error: SegmentRepositoryError,
        operation: string,
        segmentId?: SegmentId
      ) =>
        new SegmentUseCaseError({
          message: error.message,
          segmentId,
          operation,
          cause: error,
        });

      return {
        getSegment: (segmentId: SegmentId) =>
          Effect.gen(function* () {
            const segmentOption = yield* segmentRepo.get(segmentId);

            return yield* Option.match(segmentOption, {
              onNone: () =>
                Effect.fail(
                  new SegmentUseCaseError({
                    message: "Segment not found",
                    segmentId,
                    operation: "getSegment",
                  })
                ),
              onSome: (segment) => Effect.succeed(segment),
            });
          }).pipe(
            Effect.withSpan("SegmentUseCase.getSegment"),
            Effect.mapError((error) =>
              error instanceof SegmentRepositoryError
                ? mapRepositoryError(error, "getSegment", segmentId)
                : error
            )
          ),

        createSegment: (data: CreateSegmentInput) =>
          Effect.gen(function* () {
            // Business rule: Validate segment name is unique
            // TODO: Add unique name validation

            // Business rule: Validate Shopify segment ID if provided
            if (data.shopifySegmentId && data.type !== "shopify_sync") {
              return yield* Effect.fail(
                new SegmentUseCaseError({
                  message:
                    "Shopify segment ID can only be used with shopify_sync type",
                  operation: "createSegment",
                })
              );
            }

            const segment = yield* segmentRepo.create(data);
            return segment;
          }).pipe(
            Effect.withSpan("SegmentUseCase.createSegment"),
            Effect.mapError((error) =>
              error instanceof SegmentRepositoryError
                ? mapRepositoryError(error, "createSegment")
                : error
            )
          ),

        updateSegment: (segmentId: SegmentId, data: UpdateSegmentInput) =>
          Effect.gen(function* () {
            // First verify segment exists
            const existingSegmentOption = yield* segmentRepo.get(segmentId);
            const existingSegment = yield* Option.match(existingSegmentOption, {
              onNone: () =>
                Effect.fail(
                  new SegmentUseCaseError({
                    message: "Segment not found",
                    segmentId,
                    operation: "updateSegment",
                  })
                ),
              onSome: (segment) => Effect.succeed(segment),
            });

            // Business rule: Cannot change type of shopify_sync segments via update
            // (Type changes would need to be done via different operations)

            const updatedSegment = yield* segmentRepo.update(segmentId, data);
            return updatedSegment;
          }).pipe(
            Effect.withSpan("SegmentUseCase.updateSegment"),
            Effect.mapError((error) =>
              error instanceof SegmentRepositoryError
                ? mapRepositoryError(error, "updateSegment", segmentId)
                : error
            )
          ),

        deleteSegment: (segmentId: SegmentId) =>
          Effect.gen(function* () {
            // First verify segment exists
            const existingSegmentOption = yield* segmentRepo.get(segmentId);
            const existingSegment = yield* Option.match(existingSegmentOption, {
              onNone: () =>
                Effect.fail(
                  new SegmentUseCaseError({
                    message: "Segment not found",
                    segmentId,
                    operation: "deleteSegment",
                  })
                ),
              onSome: (segment) => Effect.succeed(segment),
            });

            // Business rule: Cannot delete segments that are in use by active campaigns
            // TODO: Check for active campaigns using this segment

            yield* segmentRepo.delete(segmentId);
          }).pipe(
            Effect.withSpan("SegmentUseCase.deleteSegment"),
            Effect.mapError((error) =>
              error instanceof SegmentRepositoryError
                ? mapRepositoryError(error, "deleteSegment", segmentId)
                : error
            )
          ),

        listSegments: (options) =>
          Effect.gen(function* () {
            yield* Effect.log("SegmentUseCase.listSegments - Starting", {
              options,
            });

            const result = yield* segmentRepo.list(options);

            yield* Effect.log("SegmentUseCase.listSegments - Raw repo result", {
              segmentsCount: result.segments.length,
              hasMore: result.hasMore,
              cursor: result.cursor,
              firstSegment: result.segments[0]
                ? {
                    id: result.segments[0].id,
                    name: result.segments[0].name,
                    hasCustomerCount: "customerCount" in result.segments[0],
                  }
                : null,
            });

            // TODO: Add customer count calculation here
            // The schema expects customerCount but the repository doesn't provide it
            const segmentsWithCustomerCount = result.segments.map(
              (segment) => ({
                ...segment,
                customerCount: 0, // Temporary fix - should calculate actual count
              })
            );

            const finalResult = {
              ...result,
              segments: segmentsWithCustomerCount,
            };

            yield* Effect.log(
              "SegmentUseCase.listSegments - Final result with customer counts",
              {
                segmentsCount: finalResult.segments.length,
                firstSegmentCustomerCount:
                  finalResult.segments[0]?.customerCount,
              }
            );

            return finalResult;
          }).pipe(
            Effect.withSpan("SegmentUseCase.listSegments"),
            Effect.mapError((error) =>
              error instanceof SegmentRepositoryError
                ? mapRepositoryError(error, "listSegments")
                : error
            )
          ),

        addUsersToSegment: (segmentId: SegmentId, userIds: string[]) =>
          Effect.gen(function* () {
            // Verify segment exists
            const segmentOption = yield* segmentRepo.get(segmentId);
            const segment = yield* Option.match(segmentOption, {
              onNone: () =>
                Effect.fail(
                  new SegmentUseCaseError({
                    message: "Segment not found",
                    segmentId,
                    operation: "addUsersToSegment",
                  })
                ),
              onSome: (segment) => Effect.succeed(segment),
            });

            // Business rule: Can only manually add users to manual segments
            if (segment.type !== "manual") {
              return yield* Effect.fail(
                new SegmentUseCaseError({
                  message: "Can only manually add users to manual segments",
                  segmentId,
                  operation: "addUsersToSegment",
                })
              );
            }

            yield* segmentRepo.addUsers(segmentId, userIds);
          }).pipe(
            Effect.withSpan("SegmentUseCase.addUsersToSegment"),
            Effect.mapError((error) =>
              error instanceof SegmentRepositoryError
                ? mapRepositoryError(error, "addUsersToSegment", segmentId)
                : error
            )
          ),

        removeUsersFromSegment: (segmentId: SegmentId, userIds: string[]) =>
          Effect.gen(function* () {
            // Verify segment exists
            const segmentOption = yield* segmentRepo.get(segmentId);
            const segment = yield* Option.match(segmentOption, {
              onNone: () =>
                Effect.fail(
                  new SegmentUseCaseError({
                    message: "Segment not found",
                    segmentId,
                    operation: "removeUsersFromSegment",
                  })
                ),
              onSome: (segment) => Effect.succeed(segment),
            });

            // Business rule: Can only manually remove users from manual segments
            if (segment.type !== "manual") {
              return yield* Effect.fail(
                new SegmentUseCaseError({
                  message:
                    "Can only manually remove users from manual segments",
                  segmentId,
                  operation: "removeUsersFromSegment",
                })
              );
            }

            yield* segmentRepo.removeUsers(segmentId, userIds);
          }).pipe(
            Effect.withSpan("SegmentUseCase.removeUsersFromSegment"),
            Effect.mapError((error) =>
              error instanceof SegmentRepositoryError
                ? mapRepositoryError(error, "removeUsersFromSegment", segmentId)
                : error
            )
          ),

        getUsersInSegment: (segmentId: SegmentId, options) =>
          Effect.gen(function* () {
            const result = yield* segmentRepo.getUsersInSegment(
              segmentId,
              options
            );
            return result;
          }).pipe(
            Effect.withSpan("SegmentUseCase.getUsersInSegment"),
            Effect.mapError((error) =>
              error instanceof SegmentRepositoryError
                ? mapRepositoryError(error, "getUsersInSegment", segmentId)
                : error
            )
          ),

        syncSegment: (data: SegmentSyncInput) =>
          Effect.gen(function* () {
            // Verify segment exists
            const segmentOption = yield* segmentRepo.get(data.segmentId);
            const segment = yield* Option.match(segmentOption, {
              onNone: () =>
                Effect.fail(
                  new SegmentUseCaseError({
                    message: "Segment not found",
                    segmentId: data.segmentId,
                    operation: "syncSegment",
                  })
                ),
              onSome: (segment) => Effect.succeed(segment),
            });

            // Business rule: Can only sync Shopify segments
            if (segment.type !== "shopify_sync") {
              return yield* Effect.fail(
                new SegmentUseCaseError({
                  message: "Can only sync Shopify segments",
                  segmentId: data.segmentId,
                  operation: "syncSegment",
                })
              );
            }

            // Update last sync timestamp
            yield* segmentRepo.update(data.segmentId, {
              // lastSyncAt is not in UpdateSegmentInput, but should be handled at repo level
            });

            // TODO: Implement actual Shopify sync logic
            const syncedUsers = 0; // Placeholder

            return {
              success: true,
              syncedUsers,
            };
          }).pipe(
            Effect.withSpan("SegmentUseCase.syncSegment"),
            Effect.mapError((error) =>
              error instanceof SegmentRepositoryError
                ? mapRepositoryError(error, "syncSegment", data.segmentId)
                : error
            )
          ),

        getSegmentAnalytics: (segmentId: SegmentId) =>
          Effect.gen(function* () {
            const segmentOption = yield* segmentRepo.get(segmentId);
            const segment = yield* Option.match(segmentOption, {
              onNone: () =>
                Effect.fail(
                  new SegmentUseCaseError({
                    message: "Segment not found",
                    segmentId,
                    operation: "getSegmentAnalytics",
                  })
                ),
              onSome: (segment) => Effect.succeed(segment),
            });

            // TODO: Calculate real analytics from user data and campaigns
            const analytics: SegmentAnalytics = {
              segmentId,
              customerCount: 0, // Would calculate from actual users
              campaignsUsing: 0, // Would query campaigns using this segment
              lastCalculatedAt: new Date(),
            };

            return analytics;
          }).pipe(
            Effect.withSpan("SegmentUseCase.getSegmentAnalytics"),
            Effect.mapError((error) =>
              error instanceof SegmentRepositoryError
                ? mapRepositoryError(error, "getSegmentAnalytics", segmentId)
                : error
            )
          ),
      };
    })
  );
