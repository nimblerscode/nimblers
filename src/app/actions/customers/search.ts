"use server";

import { Effect, pipe } from "effect";
import type { OrganizationSlug } from "@/domain/tenant/shared/branded-types";
import type { SerializableCustomer } from "./list";

// Search parameters interface
export interface CustomerSearchParams {
  query?: string;
  tags?: string[];
  status?: "active" | "inactive" | "unsubscribed";
  optInEmail?: boolean;
  optInSMS?: boolean;
  optInWhatsApp?: boolean;
  totalSpentMin?: number;
  totalSpentMax?: number;
  orderCountMin?: number;
  orderCountMax?: number;
  joinedAfter?: string;
  joinedBefore?: string;
  lastOrderAfter?: string;
  lastOrderBefore?: string;
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "lastOrderAt" | "totalSpent" | "email";
  sortOrder?: "asc" | "desc";
}

export interface CustomerSearchResult {
  customers: SerializableCustomer[];
  total: number;
  hasMore: boolean;
  filters: {
    statuses: { value: string; count: number }[];
    tags: { value: string; count: number }[];
    totalSpentRanges: { min: number; max: number; count: number }[];
  };
}

export async function searchCustomers(
  organizationSlug: OrganizationSlug,
  params: CustomerSearchParams = {}
): Promise<CustomerSearchResult> {
  const program = pipe(
    Effect.gen(function* (_) {
      // For now, return mock search results
      // This will be connected to the DO client in the next implementation

      const allCustomers: SerializableCustomer[] = [
        {
          id: "1",
          email: "alice.johnson@example.com",
          firstName: "Alice",
          lastName: "Johnson",
          phone: "+1234567890",
          status: "active",
          optInEmail: true,
          optInSMS: false,
          optInWhatsApp: true,
          tags: ["vip", "premium"],
          totalSpent: 1250.5,
          orderCount: "12",
          lastOrderAt: "2024-01-15T00:00:00.000Z",
          createdAt: "2023-06-15T00:00:00.000Z",
          updatedAt: "2024-01-15T00:00:00.000Z",
        },
        {
          id: "2",
          email: "bob.smith@example.com",
          firstName: "Bob",
          lastName: "Smith",
          phone: "+1987654321",
          status: "active",
          optInEmail: true,
          optInSMS: true,
          optInWhatsApp: false,
          tags: ["regular"],
          totalSpent: 450.25,
          orderCount: 5,
          lastOrderAt: new Date("2024-01-10"),
          createdAt: new Date("2023-08-20"),
          updatedAt: new Date("2024-01-10"),
        },
        {
          id: "3",
          email: "carol.brown@example.com",
          firstName: "Carol",
          lastName: "Brown",
          status: "inactive",
          optInEmail: false,
          optInSMS: false,
          optInWhatsApp: false,
          tags: ["churned"],
          totalSpent: 89.99,
          orderCount: 2,
          lastOrderAt: new Date("2023-12-05"),
          createdAt: new Date("2023-11-10"),
          updatedAt: new Date("2023-12-05"),
        },
      ];

      // Apply search filters
      let filteredCustomers = allCustomers;

      // Text search
      if (params.query) {
        const query = params.query.toLowerCase();
        filteredCustomers = filteredCustomers.filter(
          (customer) =>
            customer.email.toLowerCase().includes(query) ||
            customer.firstName?.toLowerCase().includes(query) ||
            customer.lastName?.toLowerCase().includes(query) ||
            customer.tags?.some((tag) => tag.toLowerCase().includes(query))
        );
      }

      // Status filter
      if (params.status) {
        filteredCustomers = filteredCustomers.filter(
          (customer) => customer.status === params.status
        );
      }

      // Tag filter
      if (params.tags && params.tags.length > 0) {
        filteredCustomers = filteredCustomers.filter((customer) =>
          customer.tags?.some((tag) => params.tags!.includes(tag))
        );
      }

      // Marketing preferences filters
      if (params.optInEmail !== undefined) {
        filteredCustomers = filteredCustomers.filter(
          (customer) => customer.optInEmail === params.optInEmail
        );
      }

      if (params.optInSMS !== undefined) {
        filteredCustomers = filteredCustomers.filter(
          (customer) => customer.optInSMS === params.optInSMS
        );
      }

      if (params.optInWhatsApp !== undefined) {
        filteredCustomers = filteredCustomers.filter(
          (customer) => customer.optInWhatsApp === params.optInWhatsApp
        );
      }

      // Total spent range filters
      if (params.totalSpentMin !== undefined) {
        filteredCustomers = filteredCustomers.filter(
          (customer) => (customer.totalSpent || 0) >= params.totalSpentMin!
        );
      }

      if (params.totalSpentMax !== undefined) {
        filteredCustomers = filteredCustomers.filter(
          (customer) => (customer.totalSpent || 0) <= params.totalSpentMax!
        );
      }

      // Order count range filters
      if (params.orderCountMin !== undefined) {
        filteredCustomers = filteredCustomers.filter(
          (customer) => customer.orderCount >= params.orderCountMin!
        );
      }

      if (params.orderCountMax !== undefined) {
        filteredCustomers = filteredCustomers.filter(
          (customer) => customer.orderCount <= params.orderCountMax!
        );
      }

      // Date filters
      if (params.joinedAfter) {
        const afterDate = new Date(params.joinedAfter);
        filteredCustomers = filteredCustomers.filter(
          (customer) => customer.createdAt >= afterDate
        );
      }

      if (params.joinedBefore) {
        const beforeDate = new Date(params.joinedBefore);
        filteredCustomers = filteredCustomers.filter(
          (customer) => customer.createdAt <= beforeDate
        );
      }

      if (params.lastOrderAfter) {
        const afterDate = new Date(params.lastOrderAfter);
        filteredCustomers = filteredCustomers.filter(
          (customer) =>
            customer.lastOrderAt && customer.lastOrderAt >= afterDate
        );
      }

      if (params.lastOrderBefore) {
        const beforeDate = new Date(params.lastOrderBefore);
        filteredCustomers = filteredCustomers.filter(
          (customer) =>
            customer.lastOrderAt && customer.lastOrderAt <= beforeDate
        );
      }

      // Sorting
      const sortBy = params.sortBy || "createdAt";
      const sortOrder = params.sortOrder || "desc";

      filteredCustomers.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case "email":
            comparison = a.email.localeCompare(b.email);
            break;
          case "totalSpent":
            comparison = (a.totalSpent || 0) - (b.totalSpent || 0);
            break;
          case "lastOrderAt":
            if (a.lastOrderAt && b.lastOrderAt) {
              comparison = a.lastOrderAt.getTime() - b.lastOrderAt.getTime();
            } else if (a.lastOrderAt) {
              comparison = 1;
            } else if (b.lastOrderAt) {
              comparison = -1;
            }
            break;
          case "createdAt":
          default:
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
        }

        return sortOrder === "desc" ? -comparison : comparison;
      });

      // Pagination
      const total = filteredCustomers.length;
      const limit = params.limit || 20;
      const offset = params.offset || 0;
      const paginatedCustomers = filteredCustomers.slice(
        offset,
        offset + limit
      );
      const hasMore = offset + limit < total;

      // Generate filters for UI
      const statusCounts = allCustomers.reduce((acc, customer) => {
        acc[customer.status] = (acc[customer.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const tagCounts = allCustomers.reduce((acc, customer) => {
        customer.tags?.forEach((tag) => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>);

      const filters = {
        statuses: Object.entries(statusCounts).map(([value, count]) => ({
          value,
          count,
        })),
        tags: Object.entries(tagCounts).map(([value, count]) => ({
          value,
          count,
        })),
        totalSpentRanges: [
          {
            min: 0,
            max: 100,
            count: allCustomers.filter((c) => (c.totalSpent || 0) <= 100)
              .length,
          },
          {
            min: 100,
            max: 500,
            count: allCustomers.filter(
              (c) => (c.totalSpent || 0) > 100 && (c.totalSpent || 0) <= 500
            ).length,
          },
          {
            min: 500,
            max: 1000,
            count: allCustomers.filter(
              (c) => (c.totalSpent || 0) > 500 && (c.totalSpent || 0) <= 1000
            ).length,
          },
          {
            min: 1000,
            max: Infinity,
            count: allCustomers.filter((c) => (c.totalSpent || 0) > 1000)
              .length,
          },
        ],
      };

      return {
        customers: paginatedCustomers,
        total,
        hasMore,
        filters,
      };
    }),
    Effect.catchAll((error) => {
      console.error("Error searching customers:", error);
      return Effect.succeed({
        customers: [],
        total: 0,
        hasMore: false,
        filters: {
          statuses: [],
          tags: [],
          totalSpentRanges: [],
        },
      });
    })
  );

  return Effect.runPromise(program);
}

export async function getCustomersByTag(
  organizationSlug: OrganizationSlug,
  tag: string,
  limit = 20,
  offset = 0
): Promise<{
  customers: SerializableCustomer[];
  total: number;
  hasMore: boolean;
}> {
  return searchCustomers(organizationSlug, {
    tags: [tag],
    limit,
    offset,
  });
}

export async function getHighValueCustomers(
  organizationSlug: OrganizationSlug,
  minimumSpent = 1000,
  limit = 20,
  offset = 0
): Promise<{
  customers: SerializableCustomer[];
  total: number;
  hasMore: boolean;
}> {
  return searchCustomers(organizationSlug, {
    totalSpentMin: minimumSpent,
    sortBy: "totalSpent",
    sortOrder: "desc",
    limit,
    offset,
  });
}

export async function getRecentCustomers(
  organizationSlug: OrganizationSlug,
  days = 30,
  limit = 20,
  offset = 0
): Promise<{
  customers: SerializableCustomer[];
  total: number;
  hasMore: boolean;
}> {
  const joinedAfter = new Date();
  joinedAfter.setDate(joinedAfter.getDate() - days);

  return searchCustomers(organizationSlug, {
    joinedAfter: joinedAfter.toISOString(),
    sortBy: "createdAt",
    sortOrder: "desc",
    limit,
    offset,
  });
}

export async function getInactiveCustomers(
  organizationSlug: OrganizationSlug,
  daysSinceLastOrder = 90,
  limit = 20,
  offset = 0
): Promise<{
  customers: SerializableCustomer[];
  total: number;
  hasMore: boolean;
}> {
  const lastOrderBefore = new Date();
  lastOrderBefore.setDate(lastOrderBefore.getDate() - daysSinceLastOrder);

  return searchCustomers(organizationSlug, {
    lastOrderBefore: lastOrderBefore.toISOString(),
    status: "active",
    sortBy: "lastOrderAt",
    sortOrder: "asc",
    limit,
    offset,
  });
}
