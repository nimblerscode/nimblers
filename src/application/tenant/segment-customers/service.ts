import { Effect, Layer } from "effect";
import {
  SegmentCustomerUseCase,
  SegmentCustomerRepo,
} from "@/domain/tenant/segment-customers/service";
import type {
  AddCustomerToSegmentInput,
  RemoveCustomerFromSegmentInput,
  ListSegmentCustomersInput,
  SegmentCustomerError,
} from "@/domain/tenant/segment-customers/models";

export const SegmentCustomerUseCaseLive = Layer.effect(
  SegmentCustomerUseCase,
  Effect.gen(function* () {
    const segmentCustomerRepo = yield* SegmentCustomerRepo;

    return {
      addCustomerToSegment: (input: AddCustomerToSegmentInput) =>
        Effect.gen(function* () {
          // Check if customer is already in the segment
          const isAlreadyInSegment =
            yield* segmentCustomerRepo.isCustomerInSegment(
              input.segmentId,
              input.customerId
            );

          if (isAlreadyInSegment) {
            return yield* Effect.fail({
              _tag: "SegmentCustomerAlreadyExistsError",
              segmentId: input.segmentId,
              customerId: input.customerId,
              message: "Customer is already in segment",
            } as SegmentCustomerError);
          }

          const segmentCustomer =
            yield* segmentCustomerRepo.addCustomerToSegment(input);
          return segmentCustomer;
        }).pipe(Effect.withSpan("SegmentCustomerUseCase.addCustomerToSegment")),

      removeCustomerFromSegment: (input: RemoveCustomerFromSegmentInput) =>
        Effect.gen(function* () {
          yield* segmentCustomerRepo.removeCustomerFromSegment(input);
        }).pipe(
          Effect.withSpan("SegmentCustomerUseCase.removeCustomerFromSegment")
        ),

      listSegmentCustomers: (input: ListSegmentCustomersInput) =>
        Effect.gen(function* () {
          const segmentCustomers =
            yield* segmentCustomerRepo.listSegmentCustomers(input);
          return segmentCustomers;
        }).pipe(Effect.withSpan("SegmentCustomerUseCase.listSegmentCustomers")),

      getSegmentCustomerCount: (segmentId: string) =>
        Effect.gen(function* () {
          const count = yield* segmentCustomerRepo.getSegmentCustomerCount(
            segmentId
          );
          return count;
        }).pipe(
          Effect.withSpan("SegmentCustomerUseCase.getSegmentCustomerCount")
        ),

      isCustomerInSegment: (segmentId: string, customerId: string) =>
        Effect.gen(function* () {
          const isInSegment = yield* segmentCustomerRepo.isCustomerInSegment(
            segmentId,
            customerId
          );
          return isInSegment;
        }).pipe(Effect.withSpan("SegmentCustomerUseCase.isCustomerInSegment")),

      listCustomerSegments: (customerId: string) =>
        Effect.gen(function* () {
          const segments = yield* segmentCustomerRepo.listCustomerSegments(
            customerId
          );
          return segments;
        }).pipe(Effect.withSpan("SegmentCustomerUseCase.listCustomerSegments")),

      bulkAddCustomersToSegment: (
        segmentId: string,
        customerIds: string[],
        addedBy?: string,
        source?: string
      ) =>
        Effect.gen(function* () {
          // Filter out customers that are already in the segment
          const existingChecks = yield* Effect.all(
            customerIds.map((customerId) =>
              segmentCustomerRepo
                .isCustomerInSegment(segmentId, customerId)
                .pipe(Effect.map((exists) => ({ customerId, exists })))
            ),
            { concurrency: 10 }
          );

          const newCustomerIds = existingChecks
            .filter((check) => !check.exists)
            .map((check) => check.customerId);

          if (newCustomerIds.length === 0) {
            return [];
          }

          const segmentCustomers =
            yield* segmentCustomerRepo.bulkAddCustomersToSegment(
              segmentId,
              newCustomerIds,
              addedBy,
              source
            );

          return segmentCustomers;
        }).pipe(
          Effect.withSpan("SegmentCustomerUseCase.bulkAddCustomersToSegment")
        ),

      bulkRemoveCustomersFromSegment: (
        segmentId: string,
        customerIds: string[]
      ) =>
        Effect.gen(function* () {
          yield* segmentCustomerRepo.bulkRemoveCustomersFromSegment(
            segmentId,
            customerIds
          );
        }).pipe(
          Effect.withSpan(
            "SegmentCustomerUseCase.bulkRemoveCustomersFromSegment"
          )
        ),
    };
  })
);
