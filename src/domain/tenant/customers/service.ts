import { Context, Effect } from "effect";
import type {
  Customer,
  CustomerId,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerError,
} from "./models";

// === Customer Repository Interface ===
export abstract class CustomerRepo extends Context.Tag("@core/CustomerRepo")<
  CustomerRepo,
  {
    readonly create: (
      input: CreateCustomerInput
    ) => Effect.Effect<Customer, CustomerError>;
    readonly findById: (
      id: CustomerId
    ) => Effect.Effect<Customer | null, CustomerError>;
    readonly findByEmail: (
      email: string
    ) => Effect.Effect<Customer | null, CustomerError>;
    readonly list: (params?: {
      limit?: number;
      offset?: number;
      status?: string;
    }) => Effect.Effect<Customer[], CustomerError>;
    readonly update: (
      id: CustomerId,
      input: UpdateCustomerInput
    ) => Effect.Effect<Customer, CustomerError>;
    readonly delete: (id: CustomerId) => Effect.Effect<void, CustomerError>;
    readonly count: () => Effect.Effect<number, CustomerError>;
    readonly search: (params: {
      query?: string;
      tags?: string[];
      status?: string;
      limit?: number;
      offset?: number;
    }) => Effect.Effect<Customer[], CustomerError>;
  }
>() {}

// === Customer Use Case Interface ===
export abstract class CustomerUseCase extends Context.Tag(
  "@core/CustomerUseCase"
)<
  CustomerUseCase,
  {
    readonly createCustomer: (
      input: CreateCustomerInput
    ) => Effect.Effect<Customer, CustomerError>;
    readonly getCustomer: (
      id: CustomerId
    ) => Effect.Effect<Customer, CustomerError>;
    readonly getCustomerByEmail: (
      email: string
    ) => Effect.Effect<Customer | null, CustomerError>;
    readonly listCustomers: (params?: {
      limit?: number;
      offset?: number;
      status?: string;
    }) => Effect.Effect<Customer[], CustomerError>;
    readonly updateCustomer: (
      id: CustomerId,
      input: UpdateCustomerInput
    ) => Effect.Effect<Customer, CustomerError>;
    readonly deleteCustomer: (
      id: CustomerId
    ) => Effect.Effect<void, CustomerError>;
    readonly getCustomerCount: () => Effect.Effect<number, CustomerError>;
    readonly searchCustomers: (params: {
      query?: string;
      tags?: string[];
      status?: string;
      limit?: number;
      offset?: number;
    }) => Effect.Effect<Customer[], CustomerError>;
    readonly importCustomers: (
      customers: CreateCustomerInput[]
    ) => Effect.Effect<Customer[], CustomerError>;
  }
>() {}
