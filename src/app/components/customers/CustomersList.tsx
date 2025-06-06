"use client";

import { VStack, HStack, Card, Button } from "@/app/design-system";
import type { SerializableCustomer } from "@/app/actions/customers/list";

interface CustomersListProps {
  customers: SerializableCustomer[];
  organizationSlug: string;
}

export function CustomersList({ customers, organizationSlug }: CustomersListProps) {
  if (customers.length === 0) {
    return (
      <VStack gap="6" alignItems="center" style={{ padding: "3rem 0" }}>
        <VStack gap="2" alignItems="center">
          <span style={{ fontSize: "1.125rem", fontWeight: "600" }}>
            No customers yet
          </span>
          <span style={{ fontSize: "0.875rem", color: "var(--colors-content-secondary)", textAlign: "center" }}>
            Add your first customer to start building segments and running campaigns.
          </span>
        </VStack>
        <Button variant="primary">
          Add Your First Customer
        </Button>
      </VStack>
    );
  }

  return (
    <VStack gap="3" alignItems="stretch">
      {customers.map((customer) => (
        <CustomerCard key={customer.id} customer={customer} organizationSlug={organizationSlug} />
      ))}
    </VStack>
  );
}

interface CustomerCardProps {
  customer: SerializableCustomer;
  organizationSlug: string;
}

function CustomerCard({ customer, organizationSlug }: CustomerCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: string | undefined) => {
    if (!amount) return "$0.00";
    return `$${Number.parseFloat(amount).toFixed(2)}`;
  };

  return (
    <Card style={{ padding: "1rem" }}>
      <HStack justify="space-between" alignItems="center">
        <VStack gap="2" alignItems="flex-start" flex="1">
          {/* Customer Name & Email */}
          <VStack gap="1" alignItems="flex-start">
            <HStack gap="2" alignItems="center">
              <span style={{ fontSize: "1rem", fontWeight: "600" }}>
                {customer.firstName || customer.lastName
                  ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
                  : "Unnamed Customer"
                }
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "0.375rem",
                  backgroundColor: customer.status === "active" ? "var(--colors-green-100)" : "var(--colors-gray-100)",
                  color: customer.status === "active" ? "var(--colors-green-800)" : "var(--colors-gray-800)",
                }}
              >
                {customer.status}
              </span>
            </HStack>
            <span style={{ fontSize: "0.875rem", color: "var(--colors-content-secondary)" }}>
              {customer.email}
            </span>
            {customer.phone && (
              <span style={{ fontSize: "0.875rem", color: "var(--colors-content-secondary)" }}>
                {customer.phone}
              </span>
            )}
          </VStack>

          {/* Customer Stats */}
          <HStack gap="4" alignItems="center">
            <span style={{ fontSize: "0.75rem", color: "var(--colors-content-secondary)" }}>
              {customer.orderCount} order{customer.orderCount !== 1 ? "s" : ""}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--colors-content-secondary)" }}>
              {formatCurrency(customer.totalSpent)} spent
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--colors-content-secondary)" }}>
              Joined {formatDate(customer.createdAt)}
            </span>
          </HStack>

          {/* Tags */}
          {customer.tags && customer.tags.length > 0 && (
            <HStack gap="1" alignItems="center">
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.125rem 0.375rem",
                    borderRadius: "0.25rem",
                    backgroundColor: "var(--colors-blue-100)",
                    color: "var(--colors-blue-800)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </HStack>
          )}

          {/* Marketing Preferences */}
          <HStack gap="3" alignItems="center">
            {customer.optInEmail && (
              <span style={{ fontSize: "0.75rem", color: "var(--colors-green-600)" }}>
                ✓ Email
              </span>
            )}
            {customer.optInSMS && (
              <span style={{ fontSize: "0.75rem", color: "var(--colors-green-600)" }}>
                ✓ SMS
              </span>
            )}
            {customer.optInWhatsApp && (
              <span style={{ fontSize: "0.75rem", color: "var(--colors-green-600)" }}>
                ✓ WhatsApp
              </span>
            )}
          </HStack>
        </VStack>

        {/* Actions */}
        <VStack gap="2" alignItems="flex-end">
          <Button variant="outline" size="sm">
            Edit
          </Button>
          <Button variant="outline" size="sm">
            Add to Segment
          </Button>
        </VStack>
      </HStack>
    </Card>
  );
} 
