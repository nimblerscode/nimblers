import type { env } from "cloudflare:workers";
import { Headers } from "@effect/platform";
import { Context, Data, Effect, Layer } from "effect";
import type {
  Customer,
  CustomerId,
  CustomerError,
} from "@/domain/tenant/customers/models";
import { CustomerDbError } from "@/domain/tenant/customers/models";
import type { OrganizationSlug } from "@/domain/tenant/shared/branded-types";

// Custom error for DO interactions
export class DOInteractionError extends Data.TaggedError("DOInteractionError")<{
  readonly message: string;
  readonly status?: number;
  readonly slug?: string;
  readonly originalError?: unknown;
}> {}

// --- Required Dependency Tag ---
// The DO namespace needed by the live service
export class CustomerDONamespace extends Context.Tag(
  "cloudflare/bindings/CUSTOMER_DO_NAMESPACE"
)<
  CustomerDONamespace, // The service itself (though it's just holding the namespace)
  typeof env.ORG_DO // Use DurableObjectNamespace directly
>() {}

// --- Customer DO Service ---
export abstract class CustomerDOService extends Context.Tag(
  "@core/CustomerDOService"
)<
  CustomerDOService,
  {
    readonly listCustomers: (
      organizationSlug: OrganizationSlug,
      params?: {
        limit?: number;
        offset?: number;
        status?: string;
      }
    ) => Effect.Effect<
      {
        customers: Customer[];
        hasMore: boolean;
        total: number;
      },
      CustomerError
    >;
    readonly searchCustomers: (
      organizationSlug: OrganizationSlug,
      params: {
        query?: string;
        tags?: string[];
        status?: string;
        limit?: number;
        offset?: number;
      }
    ) => Effect.Effect<
      {
        customers: Customer[];
        hasMore: boolean;
        total: number;
      },
      CustomerError
    >;
    readonly getCustomer: (
      organizationSlug: OrganizationSlug,
      customerId: CustomerId
    ) => Effect.Effect<Customer, CustomerError>;
    readonly updateCustomer: (
      organizationSlug: OrganizationSlug,
      customerId: CustomerId,
      updateData: Record<string, unknown>
    ) => Effect.Effect<Customer, CustomerError>;
    readonly deleteCustomer: (
      organizationSlug: OrganizationSlug,
      customerId: CustomerId
    ) => Effect.Effect<void, CustomerError>;
  }
>() {}

// --- Customer DO Service Live Implementation ---
export const CustomerDOServiceLive = Layer.effect(
  CustomerDOService,
  Effect.gen(function* () {
    const customerDONamespace = yield* CustomerDONamespace;

    return {
      listCustomers: (
        organizationSlug: OrganizationSlug,
        params?: {
          limit?: number;
          offset?: number;
          status?: string;
        }
      ) => {
        return Effect.gen(function* () {
          const doId = customerDONamespace.idFromName(organizationSlug);
          const stub = customerDONamespace.get(doId);

          const url = new URL("http://internal/customers");
          if (params?.limit)
            url.searchParams.set("limit", params.limit.toString());
          if (params?.offset)
            url.searchParams.set("offset", params.offset.toString());
          if (params?.status) url.searchParams.set("status", params.status);

          const response = yield* Effect.tryPromise({
            try: async () => {
              const response = await stub.fetch(url.toString(), {
                method: "GET",
                headers: Headers.unsafeFromRecord({
                  "Content-Type": "application/json",
                }),
              });

              if (!response.ok) {
                throw new CustomerDbError({
                  message: `Failed to list customers: ${response.status}`,
                  cause: await response.text(),
                });
              }

              return (await response.json()) as {
                customers: Customer[];
                hasMore: boolean;
                total: number;
              };
            },
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to communicate with Customer DO",
                cause: error,
              }),
          });

          return response;
        });
      },

      searchCustomers: (
        organizationSlug: OrganizationSlug,
        params: {
          query?: string;
          tags?: string[];
          status?: string;
          limit?: number;
          offset?: number;
        }
      ) => {
        return Effect.gen(function* () {
          const doId = customerDONamespace.idFromName(organizationSlug);
          const stub = customerDONamespace.get(doId);

          const url = new URL("http://internal/customers/search");
          if (params.query) url.searchParams.set("query", params.query);
          if (params.tags) url.searchParams.set("tags", params.tags.join(","));
          if (params.status) url.searchParams.set("status", params.status);
          if (params.limit)
            url.searchParams.set("limit", params.limit.toString());
          if (params.offset)
            url.searchParams.set("offset", params.offset.toString());

          const response = yield* Effect.tryPromise({
            try: async () => {
              const response = await stub.fetch(url.toString(), {
                method: "GET",
                headers: Headers.unsafeFromRecord({
                  "Content-Type": "application/json",
                }),
              });

              if (!response.ok) {
                throw new CustomerDbError({
                  message: `Failed to search customers: ${response.status}`,
                  cause: await response.text(),
                });
              }

              return (await response.json()) as {
                customers: Customer[];
                hasMore: boolean;
                total: number;
              };
            },
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to communicate with Customer DO",
                cause: error,
              }),
          });

          return response;
        });
      },

      getCustomer: (
        organizationSlug: OrganizationSlug,
        customerId: CustomerId
      ) => {
        return Effect.gen(function* () {
          const doId = customerDONamespace.idFromName(organizationSlug);
          const stub = customerDONamespace.get(doId);

          const response = yield* Effect.tryPromise({
            try: async () => {
              const response = await stub.fetch(
                `http://internal/customers/${customerId}`,
                {
                  method: "GET",
                  headers: Headers.unsafeFromRecord({
                    "Content-Type": "application/json",
                  }),
                }
              );

              if (!response.ok) {
                throw new CustomerDbError({
                  message: `Failed to get customer: ${response.status}`,
                  cause: await response.text(),
                });
              }

              return (await response.json()) as Customer;
            },
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to communicate with Customer DO",
                cause: error,
              }),
          });

          return response;
        });
      },

      updateCustomer: (
        organizationSlug: OrganizationSlug,
        customerId: CustomerId,
        updateData: Record<string, unknown>
      ) => {
        return Effect.gen(function* () {
          const doId = customerDONamespace.idFromName(organizationSlug);
          const stub = customerDONamespace.get(doId);

          const response = yield* Effect.tryPromise({
            try: async () => {
              const response = await stub.fetch(
                `http://internal/customers/${customerId}`,
                {
                  method: "PUT",
                  headers: Headers.unsafeFromRecord({
                    "Content-Type": "application/json",
                  }),
                  body: JSON.stringify(updateData),
                }
              );

              if (!response.ok) {
                throw new CustomerDbError({
                  message: `Failed to update customer: ${response.status}`,
                  cause: await response.text(),
                });
              }

              return (await response.json()) as Customer;
            },
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to communicate with Customer DO",
                cause: error,
              }),
          });

          return response;
        });
      },

      deleteCustomer: (
        organizationSlug: OrganizationSlug,
        customerId: CustomerId
      ) => {
        return Effect.gen(function* () {
          const doId = customerDONamespace.idFromName(organizationSlug);
          const stub = customerDONamespace.get(doId);

          yield* Effect.tryPromise({
            try: async () => {
              const response = await stub.fetch(
                `http://internal/customers/${customerId}`,
                {
                  method: "DELETE",
                  headers: Headers.unsafeFromRecord({
                    "Content-Type": "application/json",
                  }),
                }
              );

              if (!response.ok) {
                throw new CustomerDbError({
                  message: `Failed to delete customer: ${response.status}`,
                  cause: await response.text(),
                });
              }
            },
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to communicate with Customer DO",
                cause: error,
              }),
          });
        });
      },
    };
  })
);
