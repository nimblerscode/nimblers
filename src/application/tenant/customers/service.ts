import { Effect, Layer } from "effect";
import { CustomerUseCase } from "@/domain/tenant/customers/service";
import { CustomerRepo } from "@/domain/tenant/customers/service";
import type {
  Customer,
  CustomerId,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerError,
} from "@/domain/tenant/customers/models";

export const CustomerUseCaseLive = Layer.effect(
  CustomerUseCase,
  Effect.gen(function* () {
    const customerRepo = yield* CustomerRepo;

    return {
      createCustomer: (input: CreateCustomerInput) =>
        Effect.gen(function* () {
          const customer = yield* customerRepo.create(input);
          return customer;
        }).pipe(Effect.withSpan("CustomerUseCase.createCustomer")),

      getCustomer: (id: CustomerId) =>
        Effect.gen(function* () {
          const customer = yield* customerRepo.findById(id);
          if (!customer) {
            return yield* Effect.fail({
              _tag: "CustomerNotFoundError",
              customerId: id,
              message: `Customer with ID ${id} not found`,
            } as CustomerError);
          }
          return customer;
        }).pipe(Effect.withSpan("CustomerUseCase.getCustomer")),

      getCustomerByEmail: (email: string) =>
        Effect.gen(function* () {
          const customer = yield* customerRepo.findByEmail(email);
          return customer;
        }).pipe(Effect.withSpan("CustomerUseCase.getCustomerByEmail")),

      listCustomers: (params?: {
        limit?: number;
        offset?: number;
        status?: string;
      }) =>
        Effect.gen(function* () {
          const customers = yield* customerRepo.list(params);
          return customers;
        }).pipe(Effect.withSpan("CustomerUseCase.listCustomers")),

      updateCustomer: (id: CustomerId, input: UpdateCustomerInput) =>
        Effect.gen(function* () {
          const customer = yield* customerRepo.update(id, input);
          return customer;
        }).pipe(Effect.withSpan("CustomerUseCase.updateCustomer")),

      deleteCustomer: (id: CustomerId) =>
        Effect.gen(function* () {
          yield* customerRepo.delete(id);
        }).pipe(Effect.withSpan("CustomerUseCase.deleteCustomer")),

      getCustomerCount: () =>
        Effect.gen(function* () {
          const count = yield* customerRepo.count();
          return count;
        }).pipe(Effect.withSpan("CustomerUseCase.getCustomerCount")),

      searchCustomers: (params: {
        query?: string;
        tags?: string[];
        status?: string;
        limit?: number;
        offset?: number;
      }) =>
        Effect.gen(function* () {
          const customers = yield* customerRepo.search(params);
          return customers;
        }).pipe(Effect.withSpan("CustomerUseCase.searchCustomers")),

      importCustomers: (customers: CreateCustomerInput[]) =>
        Effect.gen(function* () {
          // Import customers in batches to avoid overwhelming the database
          const batchSize = 50;
          const batches = [];

          for (let i = 0; i < customers.length; i += batchSize) {
            batches.push(customers.slice(i, i + batchSize));
          }

          const importedCustomers: Customer[] = [];

          for (const batch of batches) {
            const batchResults = yield* Effect.all(
              batch.map((customer) => customerRepo.create(customer)),
              { concurrency: 10 }
            );
            importedCustomers.push(...batchResults);
          }

          return importedCustomers;
        }).pipe(Effect.withSpan("CustomerUseCase.importCustomers")),
    };
  })
);
