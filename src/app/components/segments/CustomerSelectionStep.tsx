"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TextField,
  VStack,
  HStack,
  Text,
  Button,
  Banner,
  Pill,
} from "@/app/design-system";
import type { SerializableCustomer } from "@/app/actions/customers/list";
import { getCustomers, searchCustomers } from "@/app/actions/customers/list";

interface CustomerSelectionStepProps {
  organizationSlug: string;
  selectedCustomerIds: string[];
  onSelectionChange: (customerIds: string[]) => void;
  maxSelections?: number;
}

export function CustomerSelectionStep({
  organizationSlug,
  selectedCustomerIds,
  onSelectionChange,
  maxSelections = 100,
}: CustomerSelectionStepProps) {
  const [customers, setCustomers] = useState<SerializableCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial customers
  useEffect(() => {
    loadCustomers();
  }, []);

  // Search customers when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchForCustomers();
      } else {
        loadCustomers();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getCustomers(organizationSlug as any, { limit: 50 });
      setCustomers(result.customers);
    } catch (err) {
      setError("Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  };

  const searchForCustomers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await searchCustomers(organizationSlug as any, {
        query: searchQuery,
        limit: 50,
      });
      setCustomers(result.customers);
    } catch (err) {
      setError("Failed to search customers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerToggle = (customerId: string) => {
    const isSelected = selectedCustomerIds.includes(customerId);

    if (isSelected) {
      // Remove customer
      onSelectionChange(selectedCustomerIds.filter(id => id !== customerId));
    } else {
      // Add customer (if under max limit)
      if (selectedCustomerIds.length < maxSelections) {
        onSelectionChange([...selectedCustomerIds, customerId]);
      }
    }
  };

  const handleSelectAll = () => {
    const visibleCustomerIds = customers.map(c => c.id);
    const unselectedVisible = visibleCustomerIds.filter(id => !selectedCustomerIds.includes(id));
    const availableSlots = maxSelections - selectedCustomerIds.length;
    const toAdd = unselectedVisible.slice(0, availableSlots);
    onSelectionChange([...selectedCustomerIds, ...toAdd]);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  const getCustomerDisplayName = (customer: SerializableCustomer) => {
    if (customer.firstName && customer.lastName) {
      return `${customer.firstName} ${customer.lastName}`;
    }
    return customer.email;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Customers to Segment (Optional)</CardTitle>
        <Text color="content.secondary">
          Select customers to add to this segment. You can also add customers later.
        </Text>
      </CardHeader>

      <CardContent>
        <VStack gap="4" alignItems="stretch">
          {/* Search */}
          <TextField
            label="Search Customers"
            inputProps={{
              placeholder: "Search by name, email, or phone...",
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              variantSize: "lg",
            }}
          />

          {/* Selection Info */}
          <HStack justifyContent="space-between" alignItems="center">
            <Text>
              {selectedCustomerIds.length} of {maxSelections} customers selected
            </Text>
            <HStack gap="2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                isDisabled={customers.length === 0 || selectedCustomerIds.length >= maxSelections}
              >
                Select All Visible
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                isDisabled={selectedCustomerIds.length === 0}
              >
                Deselect All
              </Button>
            </HStack>
          </HStack>

          {/* Selection Limit Warning */}
          {selectedCustomerIds.length >= maxSelections && (
            <Banner variant="warning">
              You've reached the maximum selection limit of {maxSelections} customers.
            </Banner>
          )}

          {/* Error State */}
          {error && (
            <Banner variant="danger">
              {error}
            </Banner>
          )}

          {/* Customer List */}
          {isLoading ? (
            <Text>Loading customers...</Text>
          ) : customers.length === 0 ? (
            <Text color="content.secondary">
              {searchQuery ? "No customers found matching your search." : "No customers available."}
            </Text>
          ) : (
            <VStack gap="2" alignItems="stretch" style={{ maxHeight: "400px", overflowY: "auto" }}>
              {customers.map((customer) => {
                const isSelected = selectedCustomerIds.includes(customer.id);
                return (
                  <label
                    key={customer.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px",
                      border: isSelected ? "2px solid #0066cc" : "1px solid #e5e5e5",
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: isSelected ? "#f0f8ff" : "white",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCustomerToggle(customer.id)}
                      disabled={!isSelected && selectedCustomerIds.length >= maxSelections}
                    />
                    <VStack gap="1" alignItems="flex-start" style={{ flex: 1 }}>
                      <HStack gap="2" alignItems="center">
                        <Text style={{ fontWeight: "500" }}>
                          {getCustomerDisplayName(customer)}
                        </Text>
                        <Pill variant={customer.status === "active" ? "success" : "info"} size="sm">
                          {customer.status}
                        </Pill>
                      </HStack>
                      <Text style={{ fontSize: "0.875rem", color: "var(--colors-content-secondary)" }}>
                        {customer.email}
                        {customer.phone && ` • ${customer.phone}`}
                      </Text>
                      {customer.tags && customer.tags.length > 0 && (
                        <HStack gap="1">
                          {customer.tags.slice(0, 3).map((tag) => (
                            <Pill key={tag} variant="info" size="sm">
                              {tag}
                            </Pill>
                          ))}
                          {customer.tags.length > 3 && (
                            <Text style={{ fontSize: "0.75rem", color: "var(--colors-content-secondary)" }}>
                              +{customer.tags.length - 3} more
                            </Text>
                          )}
                        </HStack>
                      )}
                    </VStack>
                  </label>
                );
              })}
            </VStack>
          )}
        </VStack>
      </CardContent>
    </Card>
  );
} 
