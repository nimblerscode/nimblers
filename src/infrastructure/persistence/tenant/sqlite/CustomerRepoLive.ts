import { Effect, Layer, Option } from "effect";
import { CustomerRepo } from "@/domain/tenant/customers/service";
import type {
  Customer,
  CustomerId,
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@/domain/tenant/customers/models";
import {
  CustomerNotFoundError,
  CustomerDbError,
  DuplicateCustomerError,
} from "@/domain/tenant/customers/models";
import { DrizzleDOClient } from "./drizzle";
import { customer } from "./schema";
import { eq, like, or, and, sql, desc } from "drizzle-orm";

// Type for the actual database row
type SelectCustomer = typeof customer.$inferSelect;
type InsertCustomer = typeof customer.$inferInsert;

const convertToDomainCustomer = (row: SelectCustomer): Customer => ({
  id: row.id as CustomerId,
  email: row.email,
  phone: row.phone ?? undefined,
  firstName: row.firstName ?? undefined,
  lastName: row.lastName ?? undefined,
  shopifyCustomerId: row.shopifyCustomerId ?? undefined,
  externalCustomerId: row.externalCustomerId ?? undefined,
  status: row.status as Customer["status"],
  optInSMS: row.optInSMS === "true",
  optInEmail: row.optInEmail === "true",
  optInWhatsApp: row.optInWhatsApp === "true",
  tags: row.tags ? JSON.parse(row.tags) : undefined,
  totalSpent: row.totalSpent ?? undefined,
  orderCount: parseInt(row.orderCount),
  lastOrderAt: row.lastOrderAt ? new Date(row.lastOrderAt) : undefined,
  createdAt: new Date(row.createdAt),
  updatedAt: new Date(row.updatedAt),
  lastSyncAt: row.lastSyncAt ? new Date(row.lastSyncAt) : undefined,
  metadata: row.metadata ? JSON.parse(row.metadata) : {},
});

const convertToInsertCustomer = (
  data: CreateCustomerInput
): Omit<InsertCustomer, "id" | "createdAt" | "updatedAt"> => ({
  email: data.email,
  phone: data.phone ?? null,
  firstName: data.firstName ?? null,
  lastName: data.lastName ?? null,
  shopifyCustomerId: data.shopifyCustomerId ?? null,
  externalCustomerId: null,
  status: "active",
  optInSMS: (data.optInSMS || false).toString(),
  optInEmail: (data.optInEmail || false).toString(),
  optInWhatsApp: (data.optInWhatsApp || false).toString(),
  tags: data.tags ? JSON.stringify(data.tags) : null,
  totalSpent: null,
  orderCount: "0",
  lastOrderAt: null,
  lastSyncAt: null,
  metadata: JSON.stringify(data.metadata ?? {}),
});

export const CustomerRepoLive = Layer.effect(
  CustomerRepo,
  Effect.gen(function* () {
    const drizzleClient = yield* DrizzleDOClient;

    return {
      create: (data: CreateCustomerInput) =>
        Effect.gen(function* () {
          // Check for duplicate email
          const existingCustomer = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(customer)
                .where(eq(customer.email, data.email))
                .limit(1),
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to check existing customer",
                cause: error,
              }),
          });

          if (existingCustomer.length > 0) {
            return yield* Effect.fail(
              new DuplicateCustomerError({
                message: "Customer with this email already exists",
                email: data.email,
              })
            );
          }

          const insertData = convertToInsertCustomer(data);
          const now = new Date();
          const id = crypto.randomUUID();

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .insert(customer)
                .values({
                  id,
                  ...insertData,
                  createdAt: now,
                  updatedAt: now,
                } satisfies typeof customer.$inferInsert)
                .returning(),
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to create customer",
                cause: error,
              }),
          });

          return convertToDomainCustomer(result[0]);
        }),

      findById: (id: CustomerId) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(customer)
                .where(eq(customer.id, id))
                .limit(1),
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to fetch customer by ID",
                cause: error,
              }),
          });

          return result.length > 0 ? convertToDomainCustomer(result[0]) : null;
        }),

      findByEmail: (email: string) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .select()
                .from(customer)
                .where(eq(customer.email, email))
                .limit(1),
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to fetch customer by email",
                cause: error,
              }),
          });

          return result.length > 0 ? convertToDomainCustomer(result[0]) : null;
        }),

      list: (params?: { limit?: number; offset?: number; status?: string }) =>
        Effect.gen(function* () {
          let query = drizzleClient.db.select().from(customer);

          if (params?.status) {
            query = query.where(eq(customer.status, params.status));
          }

          query = query.orderBy(desc(customer.createdAt));

          if (params?.limit) {
            query = query.limit(params.limit);
          }

          if (params?.offset) {
            query = query.offset(params.offset);
          }

          const result = yield* Effect.tryPromise({
            try: () => query,
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to list customers",
                cause: error,
              }),
          });

          return result.map(convertToDomainCustomer);
        }),

      update: (id: CustomerId, data: UpdateCustomerInput) =>
        Effect.gen(function* () {
          const updateData: Partial<InsertCustomer> = {
            ...(data.email && { email: data.email }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.firstName !== undefined && { firstName: data.firstName }),
            ...(data.lastName !== undefined && { lastName: data.lastName }),
            ...(data.status && { status: data.status }),
            ...(data.optInSMS !== undefined && {
              optInSMS: data.optInSMS.toString(),
            }),
            ...(data.optInEmail !== undefined && {
              optInEmail: data.optInEmail.toString(),
            }),
            ...(data.optInWhatsApp !== undefined && {
              optInWhatsApp: data.optInWhatsApp.toString(),
            }),
            ...(data.tags && { tags: JSON.stringify(data.tags) }),
            ...(data.metadata && { metadata: JSON.stringify(data.metadata) }),
            updatedAt: new Date(),
          };

          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .update(customer)
                .set(updateData)
                .where(eq(customer.id, id))
                .returning(),
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to update customer",
                cause: error,
              }),
          });

          if (result.length === 0) {
            return yield* Effect.fail(
              new CustomerNotFoundError({
                message: "Customer not found",
                customerId: id,
              })
            );
          }

          return convertToDomainCustomer(result[0]);
        }),

      delete: (id: CustomerId) =>
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              drizzleClient.db
                .delete(customer)
                .where(eq(customer.id, id))
                .returning(),
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to delete customer",
                cause: error,
              }),
          });

          if (result.length === 0) {
            return yield* Effect.fail(
              new CustomerNotFoundError({
                message: "Customer not found",
                customerId: id,
              })
            );
          }
        }),

      search: (params: {
        query?: string;
        tags?: string[];
        status?: string;
        limit?: number;
        offset?: number;
      }) =>
        Effect.gen(function* () {
          let dbQuery = drizzleClient.db.select().from(customer);

          const conditions = [];

          // Text search in email, firstName, lastName
          if (params.query) {
            const searchTerm = `%${params.query}%`;
            conditions.push(
              or(
                like(customer.email, searchTerm),
                like(customer.firstName, searchTerm),
                like(customer.lastName, searchTerm)
              )
            );
          }

          // Status filter
          if (params.status) {
            conditions.push(eq(customer.status, params.status));
          }

          // Tags filter (simple JSON search - could be optimized with proper JSON functions)
          if (params.tags && params.tags.length > 0) {
            const tagConditions = params.tags.map((tag) =>
              like(customer.tags, `%"${tag}"%`)
            );
            conditions.push(or(...tagConditions));
          }

          if (conditions.length > 0) {
            dbQuery = dbQuery.where(and(...conditions));
          }

          dbQuery = dbQuery.orderBy(desc(customer.createdAt));

          if (params.limit) {
            dbQuery = dbQuery.limit(params.limit);
          }

          if (params.offset) {
            dbQuery = dbQuery.offset(params.offset);
          }

          const result = yield* Effect.tryPromise({
            try: () => dbQuery,
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to search customers",
                cause: error,
              }),
          });

          return result.map(convertToDomainCustomer);
        }),

      count: (params?: { status?: string }) =>
        Effect.gen(function* () {
          let query = drizzleClient.db
            .select({ count: sql<number>`count(*)` })
            .from(customer);

          if (params?.status) {
            query = query.where(eq(customer.status, params.status));
          }

          const result = yield* Effect.tryPromise({
            try: () => query,
            catch: (error) =>
              new CustomerDbError({
                message: "Failed to count customers",
                cause: error,
              }),
          });

          return result[0].count;
        }),
    };
  })
);
