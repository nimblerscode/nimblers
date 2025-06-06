"use server";

import { Effect, pipe } from "effect";
import { requestInfo } from "rwsdk/worker";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { Tracing } from "@/tracing";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";
import { FetchHttpClient } from "@effect/platform";
import { env } from "cloudflare:workers";
import type { Customer } from "@/domain/tenant/customers/models";
import type { OrganizationSlug } from "@/domain/tenant/shared/branded-types";

// Serializable customer interface for client components
export interface SerializableCustomer {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  status: string;
  optInSMS: boolean;
  optInEmail: boolean;
  optInWhatsApp: boolean;
  tags?: string[];
  totalSpent?: string;
  orderCount: number;
  lastOrderAt?: string;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
}

// Convert domain customer to serializable format
function convertToSerializable(customer: Customer): SerializableCustomer {
  return {
    id: customer.id,
    email: customer.email,
    phone: customer.phone,
    firstName: customer.firstName,
    lastName: customer.lastName,
    status: customer.status,
    optInSMS: customer.optInSMS,
    optInEmail: customer.optInEmail,
    optInWhatsApp: customer.optInWhatsApp,
    tags: customer.tags ? [...customer.tags] : undefined,
    totalSpent: customer.totalSpent,
    orderCount: customer.orderCount,
    lastOrderAt: customer.lastOrderAt?.toISOString(),
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    lastSyncAt: customer.lastSyncAt?.toISOString(),
  };
}

export async function getCustomers(
  organizationSlug: OrganizationSlug,
  params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }
): Promise<{
  customers: SerializableCustomer[];
  hasMore: boolean;
  total: number;
}> {
  const program = pipe(
    Effect.gen(function* () {
      // Get user context for authentication
      const { ctx } = requestInfo;
      const appCtx = ctx as AppContext;

      if (!appCtx.user) {
        return yield* Effect.fail(new Error("User not authenticated"));
      }

      // Use the proper Effect-TS pattern like other organization actions
      const customerProgram = Effect.gen(function* () {
        const orgDONamespace = yield* Effect.succeed(env.ORG_DO);
        const doId = orgDONamespace.idFromName(organizationSlug);
        const stub = orgDONamespace.get(doId);
        const client = yield* createOrganizationDOClient(stub);

        // Use the auto-generated client method with perfect type safety!
        const result = yield* client.organizations.listCustomers({
          urlParams: params || {},
        });

        return result;
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.withSpan("list-customers-in-do", {
          attributes: {
            "organization.slug": organizationSlug,
            "action.type": "list-customers",
            "params.limit": params?.limit?.toString(),
            "params.offset": params?.offset?.toString(),
            "params.status": params?.status,
          },
        })
      );

      const result = yield* customerProgram;

      return {
        customers: result.customers.map(convertToSerializable),
        hasMore: result.hasMore,
        total: result.total,
      };
    }),
    Effect.provide(Tracing),
    Effect.catchAll((error) => {
      return Effect.gen(function* () {
        yield* Effect.log(`Error in getCustomers: ${error}`);
        return {
          customers: [],
          hasMore: false,
          total: 0,
        };
      });
    })
  );

  return Effect.runPromise(program);
}

export async function searchCustomers(
  organizationSlug: OrganizationSlug,
  params: {
    query?: string;
    tags?: string[];
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{
  customers: SerializableCustomer[];
  hasMore: boolean;
  total: number;
}> {
  const program = pipe(
    Effect.gen(function* () {
      // Get user context for authentication
      const { ctx } = requestInfo;
      const appCtx = ctx as AppContext;

      if (!appCtx.user) {
        return yield* Effect.fail(new Error("User not authenticated"));
      }

      // Use the proper Effect-TS pattern like other organization actions
      const customerProgram = Effect.gen(function* () {
        const orgDONamespace = yield* Effect.succeed(env.ORG_DO);
        const doId = orgDONamespace.idFromName(organizationSlug);
        const stub = orgDONamespace.get(doId);
        const client = yield* createOrganizationDOClient(stub);

        // Use the auto-generated client method with perfect type safety!
        const result = yield* client.organizations.searchCustomers({
          urlParams: {
            query: params.query,
            tags: params.tags?.join(","),
            status: params.status,
            limit: params.limit,
            offset: params.offset,
          },
        });

        return result;
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.withSpan("search-customers-in-do", {
          attributes: {
            "organization.slug": organizationSlug,
            "action.type": "search-customers",
            "params.query": params.query,
            "params.status": params.status,
          },
        })
      );

      const result = yield* customerProgram;

      return {
        customers: result.customers.map(convertToSerializable),
        hasMore: result.hasMore,
        total: result.total,
      };
    }),
    Effect.provide(Tracing),
    Effect.catchAll((error) => {
      return Effect.gen(function* () {
        yield* Effect.log(`Error in searchCustomers: ${error}`);
        return {
          customers: [],
          hasMore: false,
          total: 0,
        };
      });
    })
  );

  return Effect.runPromise(program);
}
