import { Context, Effect } from "effect";
import type {
  SegmentCustomer,
  AddCustomerToSegmentInput,
  RemoveCustomerFromSegmentInput,
  ListSegmentCustomersInput,
  SegmentCustomerError,
} from "./models";

// === Segment Customer Repository Interface ===
export abstract class SegmentCustomerRepo extends Context.Tag(
  "@core/SegmentCustomerRepo"
)<
  SegmentCustomerRepo,
  {
    readonly addCustomerToSegment: (
      input: AddCustomerToSegmentInput
    ) => Effect.Effect<SegmentCustomer, SegmentCustomerError>;
    readonly removeCustomerFromSegment: (
      input: RemoveCustomerFromSegmentInput
    ) => Effect.Effect<void, SegmentCustomerError>;
    readonly listSegmentCustomers: (
      input: ListSegmentCustomersInput
    ) => Effect.Effect<SegmentCustomer[], SegmentCustomerError>;
    readonly getSegmentCustomerCount: (
      segmentId: string
    ) => Effect.Effect<number, SegmentCustomerError>;
    readonly isCustomerInSegment: (
      segmentId: string,
      customerId: string
    ) => Effect.Effect<boolean, SegmentCustomerError>;
    readonly listCustomerSegments: (
      customerId: string
    ) => Effect.Effect<SegmentCustomer[], SegmentCustomerError>;
    readonly bulkAddCustomersToSegment: (
      segmentId: string,
      customerIds: string[],
      addedBy?: string,
      source?: string
    ) => Effect.Effect<SegmentCustomer[], SegmentCustomerError>;
    readonly bulkRemoveCustomersFromSegment: (
      segmentId: string,
      customerIds: string[]
    ) => Effect.Effect<void, SegmentCustomerError>;
  }
>() {}

// === Segment Customer Use Case Interface ===
export abstract class SegmentCustomerUseCase extends Context.Tag(
  "@core/SegmentCustomerUseCase"
)<
  SegmentCustomerUseCase,
  {
    readonly addCustomerToSegment: (
      input: AddCustomerToSegmentInput
    ) => Effect.Effect<SegmentCustomer, SegmentCustomerError>;
    readonly removeCustomerFromSegment: (
      input: RemoveCustomerFromSegmentInput
    ) => Effect.Effect<void, SegmentCustomerError>;
    readonly listSegmentCustomers: (
      input: ListSegmentCustomersInput
    ) => Effect.Effect<SegmentCustomer[], SegmentCustomerError>;
    readonly getSegmentCustomerCount: (
      segmentId: string
    ) => Effect.Effect<number, SegmentCustomerError>;
    readonly isCustomerInSegment: (
      segmentId: string,
      customerId: string
    ) => Effect.Effect<boolean, SegmentCustomerError>;
    readonly listCustomerSegments: (
      customerId: string
    ) => Effect.Effect<SegmentCustomer[], SegmentCustomerError>;
    readonly bulkAddCustomersToSegment: (
      segmentId: string,
      customerIds: string[],
      addedBy?: string,
      source?: string
    ) => Effect.Effect<SegmentCustomer[], SegmentCustomerError>;
    readonly bulkRemoveCustomersFromSegment: (
      segmentId: string,
      customerIds: string[]
    ) => Effect.Effect<void, SegmentCustomerError>;
  }
>() {}
