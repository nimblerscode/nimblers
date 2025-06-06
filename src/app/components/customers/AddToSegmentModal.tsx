"use client";

import { useState } from "react";
import {
  Banner,
  Button,
  Card,
  CardContent,
  CardHeader,
  Text,
  VStack,
  HStack,
} from "@/app/design-system";
import { Heading } from "@/app/design-system/Heading";
import type { SerializableCustomer } from "@/app/actions/customers/list";
import type { SerializableSegment } from "@/app/actions/segments/list";
import { addCustomersToSegmentAction } from "@/app/actions/customers/addToSegment";

interface AddToSegmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: SerializableCustomer[];
  segments: SerializableSegment[];
  organizationSlug: string;
}



export function AddToSegmentModal({
  isOpen,
  onClose,
  customers,
  segments,
  organizationSlug,
}: AddToSegmentModalProps) {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string; message?: string } | null>(null);

  // Filter to only show manual segments (where users can be manually added)
  const manualSegments = segments.filter(segment => segment.type === "manual" && segment.status === "active");

  const handleSubmit = async () => {
    if (!selectedSegmentId) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const customerIds = customers.map(c => c.id);
      const response = await addCustomersToSegmentAction(organizationSlug as any, selectedSegmentId as any, customerIds as any);
      setResult(response);

      if (response.success) {
        // Close modal after success
        setTimeout(() => {
          onClose();
          setResult(null);
          setSelectedSegmentId("");
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        error: "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedSegment = manualSegments.find(s => s.id === selectedSegmentId);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "16px",
      }}
    >
      <Card style={{ width: "100%", maxWidth: "500px" }}>
        <CardHeader>
          <HStack gap="4" justify="space-between">
            <Heading as="h2">Add to Segment</Heading>
            <Button
              variant="ghost"
              size="sm"
              isDisabled={isSubmitting}
              onClick={onClose}
            >
              ✕
            </Button>
          </HStack>
        </CardHeader>
        <CardContent>
          <VStack gap="6" alignItems="stretch">
            {/* Customer Summary */}
            <VStack gap="2" alignItems="stretch">
              <Text>Selected Customers</Text>
              <Text style={{ fontSize: "0.875rem", color: "gray" }}>
                {customers.length} customer{customers.length === 1 ? '' : 's'} selected
              </Text>
              <div
                style={{
                  maxHeight: "100px",
                  overflowY: "auto",
                  padding: "8px",
                  background: "#f9f9f9",
                  borderRadius: "4px",
                }}
              >
                <VStack gap="1" alignItems="stretch">
                  {customers.map(customer => (
                    <Text key={customer.id} style={{ fontSize: "0.875rem" }}>
                      {customer.firstName} {customer.lastName} ({customer.email})
                    </Text>
                  ))}
                </VStack>
              </div>
            </VStack>

            {/* Segment Selection */}
            <VStack gap="3" alignItems="stretch">
              <Text>Select Segment</Text>
              {manualSegments.length === 0 ? (
                <Banner variant="warning">
                  No manual segments available. Create a manual segment first to add customers.
                </Banner>
              ) : (
                <VStack gap="2" alignItems="stretch">
                  {manualSegments.map(segment => (
                    <label
                      key={segment.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px",
                        border: selectedSegmentId === segment.id ? "2px solid #0066cc" : "1px solid #ddd",
                        borderRadius: "4px",
                        cursor: "pointer",
                        background: selectedSegmentId === segment.id ? "#f0f8ff" : "white",
                      }}
                    >
                      <input
                        type="radio"
                        name="segment"
                        value={segment.id}
                        checked={selectedSegmentId === segment.id}
                        onChange={(e) => setSelectedSegmentId(e.target.value)}
                        disabled={isSubmitting}
                      />
                      <VStack gap="1" alignItems="flex-start">
                        <Text>{segment.name}</Text>
                        <Text style={{ fontSize: "0.75rem", color: "gray" }}>
                          {segment.customerCount || 0} customers
                        </Text>
                      </VStack>
                    </label>
                  ))}
                </VStack>
              )}
            </VStack>

            {/* Selected Segment Info */}
            {selectedSegment && (
              <VStack gap="2" alignItems="stretch">
                <Text style={{ fontSize: "0.875rem", color: "gray" }}>
                  Adding to: <strong>{selectedSegment.name}</strong>
                </Text>
                <Text style={{ fontSize: "0.75rem", color: "gray" }}>
                  Current size: {selectedSegment.customerCount || 0} customers
                </Text>
              </VStack>
            )}

            {/* Result Messages */}
            {result && (
              <Banner variant={result.success ? "success" : "danger"}>
                {result.success ? result.message : result.error}
              </Banner>
            )}

            {/* Actions */}
            <HStack gap="3" justify="flex-end">
              <Button
                variant="outline"
                isDisabled={isSubmitting}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                isDisabled={!selectedSegmentId || isSubmitting || manualSegments.length === 0}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Adding..." : "Add to Segment"}
              </Button>
            </HStack>
          </VStack>
        </CardContent>
      </Card>
    </div>
  );
} 
