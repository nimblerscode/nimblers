"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Text,
  VStack,
  HStack,
  Pill,
} from "@/app/design-system";
import { AddToSegmentModal } from "./AddToSegmentModal";
import type { SerializableCustomer } from "@/app/actions/customers/list";
import type { SerializableSegment } from "@/app/actions/segments/list";

interface CustomersListWithSegmentsProps {
  customers: SerializableCustomer[];
  segments: SerializableSegment[];
  organizationSlug: string;
}

const RenderCustomerTags = ({ tags }: { tags: string[] | null }) => {
  if (!tags || tags.length === 0) return null;
  return tags.slice(0, 3).map((tag) => (
    <Pill key={tag} variant="info" size="sm">
      {tag}
    </Pill>
  ));
};

export function CustomersListWithSegments({
  customers,
  segments,
  organizationSlug,
}: CustomersListWithSegmentsProps) {
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [isAddToSegmentModalOpen, setIsAddToSegmentModalOpen] = useState(false);

  const handleSelectAll = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map(c => c.id)));
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const selectedCustomerData = customers.filter(c => selectedCustomers.has(c.id));
  const manualSegments = segments.filter(s => s.type === "manual" && s.status === "active");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (customers.length === 0) {
    return (
      <Card>
        <CardContent>
          <VStack gap="4" alignItems="center">
            <Text>No customers found</Text>
            <Text style={{ fontSize: "0.875rem", color: "gray" }}>
              Start by adding your first customer or import customers from your store.
            </Text>
          </VStack>
        </CardContent>
      </Card>
    );
  }

  return (
    <VStack gap="4" alignItems="stretch">
      {/* Bulk Actions Bar */}
      {selectedCustomers.size > 0 && (
        <Card>
          <CardContent>
            <HStack gap="4" justify="space-between">
              <Text>
                {selectedCustomers.size} customer{selectedCustomers.size === 1 ? '' : 's'} selected
              </Text>
              <HStack gap="2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCustomers(new Set())}
                >
                  Clear Selection
                </Button>
                {manualSegments.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddToSegmentModalOpen(true)}
                  >
                    Add to Segment
                  </Button>
                )}
              </HStack>
            </HStack>
          </CardContent>
        </Card>
      )}

      {/* Customer List */}
      <Card>
        <CardHeader>
          <HStack gap="4" justify="space-between">
            <CardTitle>Customers ({customers.length})</CardTitle>
            <HStack gap="2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedCustomers.size === customers.length ? 'Deselect All' : 'Select All'}
              </Button>
            </HStack>
          </HStack>
        </CardHeader>
        <CardContent>
          <VStack gap="2" alignItems="stretch">
            {customers.map((customer) => (
              <div
                key={customer.id}
                style={{
                  padding: "12px",
                  border: "1px solid #e5e5e5",
                  borderRadius: "6px",
                  background: selectedCustomers.has(customer.id) ? "#f0f8ff" : "white",
                }}
              >
                <HStack gap="3" justify="space-between">
                  <HStack gap="3">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.has(customer.id)}
                      onChange={() => handleSelectCustomer(customer.id)}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <VStack gap="2" alignItems="flex-start">
                      <HStack gap="2">
                        <Text style={{ fontWeight: "500" }}>
                          {customer.firstName} {customer.lastName}
                        </Text>
                        {customer.status && (
                          <Pill
                            variant={customer.status === "active" ? "success" : "info"}
                            size="sm"
                          >
                            {customer.status}
                          </Pill>
                        )}
                      </HStack>
                      <Text style={{ fontSize: "0.875rem", color: "gray" }}>
                        {customer.email}
                      </Text>
                      {customer.phone && (
                        <Text style={{ fontSize: "0.875rem", color: "gray" }}>
                          {customer.phone}
                        </Text>
                      )}
                    </VStack>
                  </HStack>

                  <VStack gap="2" alignItems="flex-end">
                    <Text style={{ fontSize: "0.75rem", color: "gray" }}>
                      Joined {formatDate(customer.createdAt)}
                    </Text>
                    {customer.tags && customer.tags.length > 0 && (
                      <HStack gap="1">
                        {/* {renderCustomerTags(customer.tags)} */}
                        <RenderCustomerTags tags={customer.tags} />
                        {customer.tags.length > 3 && (
                          <Text style={{ fontSize: "0.75rem", color: "gray" }}>
                            +{customer.tags.length - 3} more
                          </Text>
                        )}
                      </HStack>
                    )}
                    {(customer.totalSpent || customer.orderCount) && (
                      <Text style={{ fontSize: "0.75rem", color: "gray" }}>
                        {customer.totalSpent && `$${customer.totalSpent} spent`}
                        {customer.totalSpent && customer.orderCount && " • "}
                        {customer.orderCount && `${customer.orderCount} orders`}
                      </Text>
                    )}
                  </VStack>
                </HStack>

                {/* Marketing Preferences */}
                {(customer.optInEmail || customer.optInSMS || customer.optInWhatsApp) && (
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f0f0f0" }}>
                    <HStack gap="2">
                      <Text style={{ fontSize: "0.75rem", color: "gray" }}>Marketing:</Text>
                      {customer.optInEmail && (
                        <Pill variant="brand" size="sm">Email</Pill>
                      )}
                      {customer.optInSMS && (
                        <Pill variant="brand" size="sm">SMS</Pill>
                      )}
                      {customer.optInWhatsApp && (
                        <Pill variant="brand" size="sm">WhatsApp</Pill>
                      )}
                    </HStack>
                  </div>
                )}
              </div>
            ))}
          </VStack>
        </CardContent>
      </Card>

      {/* Add to Segment Modal */}
      <AddToSegmentModal
        isOpen={isAddToSegmentModalOpen}
        onClose={() => setIsAddToSegmentModalOpen(false)}
        customers={selectedCustomerData}
        segments={segments}
        organizationSlug={organizationSlug}
      />
    </VStack>
  );
} 