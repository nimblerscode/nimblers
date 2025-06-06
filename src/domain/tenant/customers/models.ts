import { Data, Schema as S } from "effect";

// === Branded Types ===
export const CustomerId = S.String.pipe(S.brand("CustomerId"));
export type CustomerId = S.Schema.Type<typeof CustomerId>;

// === Customer Enums ===
export const CustomerStatus = S.Union(
  S.Literal("active"),
  S.Literal("inactive"),
  S.Literal("unsubscribed")
);
export type CustomerStatus = S.Schema.Type<typeof CustomerStatus>;

// === Main Customer Schema ===
export const CustomerSchema = S.Struct({
  id: CustomerId,
  email: S.String.pipe(S.minLength(1)),
  phone: S.optional(S.String),
  firstName: S.optional(S.String),
  lastName: S.optional(S.String),

  // Integration IDs
  shopifyCustomerId: S.optional(S.String),
  externalCustomerId: S.optional(S.String),

  // Status and preferences
  status: CustomerStatus,
  optInSMS: S.Boolean,
  optInEmail: S.Boolean,
  optInWhatsApp: S.Boolean,

  // Customer attributes
  tags: S.optional(S.Array(S.String)), // Array of tags
  totalSpent: S.optional(S.String), // Stored as string for precision
  orderCount: S.Number.pipe(S.int(), S.greaterThanOrEqualTo(0)),
  lastOrderAt: S.optional(S.Date),

  // Timestamps
  createdAt: S.Date,
  updatedAt: S.Date,
  lastSyncAt: S.optional(S.Date),

  // Additional data
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});

export interface Customer extends S.Schema.Type<typeof CustomerSchema> {}

// === Create Customer Input ===
export const CreateCustomerInputSchema = S.Struct({
  email: S.String.pipe(S.minLength(1)),
  phone: S.optional(S.String),
  firstName: S.optional(S.String),
  lastName: S.optional(S.String),
  shopifyCustomerId: S.optional(S.String),
  optInSMS: S.optional(S.Boolean),
  optInEmail: S.optional(S.Boolean),
  optInWhatsApp: S.optional(S.Boolean),
  tags: S.optional(S.Array(S.String)),
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});

export interface CreateCustomerInput
  extends S.Schema.Type<typeof CreateCustomerInputSchema> {}

// === Update Customer Input ===
export const UpdateCustomerInputSchema = S.Struct({
  email: S.optional(S.String.pipe(S.minLength(1))),
  phone: S.optional(S.String),
  firstName: S.optional(S.String),
  lastName: S.optional(S.String),
  status: S.optional(CustomerStatus),
  optInSMS: S.optional(S.Boolean),
  optInEmail: S.optional(S.Boolean),
  optInWhatsApp: S.optional(S.Boolean),
  tags: S.optional(S.Array(S.String)),
  metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
});

export interface UpdateCustomerInput
  extends S.Schema.Type<typeof UpdateCustomerInputSchema> {}

// === Error Types ===
export class CustomerNotFoundError extends Data.TaggedError(
  "CustomerNotFoundError"
)<{
  readonly customerId: CustomerId;
  readonly message: string;
}> {}

export class CustomerValidationError extends Data.TaggedError(
  "CustomerValidationError"
)<{
  readonly message: string;
  readonly issues: readonly string[];
}> {}

export class CustomerDbError extends Data.TaggedError("CustomerDbError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class DuplicateCustomerError extends Data.TaggedError(
  "DuplicateCustomerError"
)<{
  readonly email: string;
  readonly message: string;
}> {}

// === Union Type for All Customer Errors ===
export type CustomerError =
  | CustomerNotFoundError
  | CustomerValidationError
  | CustomerDbError
  | DuplicateCustomerError;
