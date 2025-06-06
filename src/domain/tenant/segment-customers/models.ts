import { Data, Schema as S } from "effect";
import { CustomerId } from "../customers/models";

// === Branded Types ===
export const SegmentCustomerId = S.String.pipe(S.brand("SegmentCustomerId"));
export type SegmentCustomerId = S.Schema.Type<typeof SegmentCustomerId>;

// === Segment Customer Enums ===
export const SegmentCustomerSource = S.Union(
  S.Literal("manual"),
  S.Literal("automatic"),
  S.Literal("shopify_sync"),
  S.Literal("import")
);
export type SegmentCustomerSource = S.Schema.Type<typeof SegmentCustomerSource>;

// === Main Segment Customer Schema ===
export const SegmentCustomerSchema = S.Struct({
  id: SegmentCustomerId,
  segmentId: SegmentCustomerId, // Will be SegmentId at runtime
  customerId: CustomerId, // Will be CustomerId at runtime
  addedBy: S.optional(S.String), // User ID
  source: SegmentCustomerSource,
  addedAt: S.Date,
  qualificationMetadata: S.optional(
    S.Record({ key: S.String, value: S.Unknown })
  ),
});

export interface SegmentCustomer
  extends S.Schema.Type<typeof SegmentCustomerSchema> {}

// === Add Customer to Segment Input ===
export const AddCustomerToSegmentInputSchema = S.Struct({
  segmentId: SegmentCustomerId, // Will be SegmentId at runtime
  customerId: CustomerId, // Will be CustomerId at runtime
  addedBy: S.optional(S.String),
  source: S.optional(SegmentCustomerSource),
  qualificationMetadata: S.optional(
    S.Record({ key: S.String, value: S.Unknown })
  ),
});

export interface AddCustomerToSegmentInput
  extends S.Schema.Type<typeof AddCustomerToSegmentInputSchema> {}

// === Remove Customer from Segment Input ===
export const RemoveCustomerFromSegmentInputSchema = S.Struct({
  segmentId: SegmentCustomerId, // Will be SegmentId at runtime
  customerId: CustomerId, // Will be CustomerId at runtime
});

export interface RemoveCustomerFromSegmentInput
  extends S.Schema.Type<typeof RemoveCustomerFromSegmentInputSchema> {}

// === List Segment Customers Input ===
export const ListSegmentCustomersInputSchema = S.Struct({
  segmentId: S.String, // Will be SegmentId at runtime
  limit: S.optional(S.Number.pipe(S.int(), S.positive())),
  offset: S.optional(S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0))),
});

export interface ListSegmentCustomersInput
  extends S.Schema.Type<typeof ListSegmentCustomersInputSchema> {}

// === Error Types ===
export class SegmentCustomerNotFoundError extends Data.TaggedError(
  "SegmentCustomerNotFoundError"
)<{
  readonly segmentId: SegmentCustomerId;
  readonly customerId: CustomerId;
  readonly message: string;
}> {}

export class SegmentCustomerAlreadyExistsError extends Data.TaggedError(
  "SegmentCustomerAlreadyExistsError"
)<{
  readonly segmentId: SegmentCustomerId;
  readonly customerId: CustomerId;
  readonly message: string;
}> {}

export class SegmentCustomerValidationError extends Data.TaggedError(
  "SegmentCustomerValidationError"
)<{
  readonly message: string;
  readonly issues: readonly string[];
}> {}

export class SegmentCustomerDbError extends Data.TaggedError(
  "SegmentCustomerDbError"
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// === Union Type for All Segment Customer Errors ===
export type SegmentCustomerError =
  | SegmentCustomerNotFoundError
  | SegmentCustomerAlreadyExistsError
  | SegmentCustomerValidationError
  | SegmentCustomerDbError;
