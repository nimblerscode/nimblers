"use client";

import { useState, useEffect } from "react";
import {
  VStack,
  HStack,
  Text,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Banner,
} from "@/app/design-system";
import { getSegments, type SerializableSegment } from "@/app/actions/segments/list";

interface SegmentSelectorProps {
  organizationSlug: string;
  selectedSegmentIds: string[];
  onSelectionChange: (segmentIds: string[]) => void;
  disabled?: boolean;
}

export function SegmentSelector({
  organizationSlug,
  selectedSegmentIds,
  onSelectionChange,
  disabled = false,
}: SegmentSelectorProps) {
  const [segments, setSegments] = useState<SerializableSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSegments = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getSegments(organizationSlug);
        setSegments(result.segments);
      } catch (err) {
        setError("Failed to load segments. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadSegments();
  }, [organizationSlug]);

  const handleSegmentToggle = (segmentId: string) => {
    const isSelected = selectedSegmentIds.includes(segmentId);

    if (isSelected) {
      onSelectionChange(selectedSegmentIds.filter(id => id !== segmentId));
    } else {
      onSelectionChange([...selectedSegmentIds, segmentId]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Target Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <HStack gap="3" alignItems="center" justifyContent="center" py="8">
            <Text color="content.secondary">Loading segments...</Text>
          </HStack>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Target Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <Banner variant="danger" icon={true}>
            {error}
          </Banner>
        </CardContent>
      </Card>
    );
  }

  if (segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Target Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <Banner variant="warning" icon={true}>
            No segments available. You need to create segments before creating a campaign.
          </Banner>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Segments</CardTitle>
        <Text color="content.secondary" fontSize="sm">
          Select the customer segments to target with this campaign
        </Text>
      </CardHeader>
      <CardContent>
        <VStack gap="3" alignItems="stretch">
          {segments.map((segment) => {
            const isSelected = selectedSegmentIds.includes(segment.id);
            return (
              <label
                key={segment.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "16px",
                  border: isSelected ? "2px solid #0066cc" : "1px solid #e5e5e5",
                  borderRadius: "8px",
                  cursor: disabled ? "not-allowed" : "pointer",
                  background: isSelected ? "#f0f8ff" : "white",
                  transition: "all 0.2s ease",
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSegmentToggle(segment.id)}
                  disabled={disabled}
                  style={{ marginTop: "2px" }}
                />
                <VStack gap="1" alignItems="flex-start" style={{ flex: 1 }}>
                  <HStack gap="2" alignItems="center">
                    <Text fontWeight="medium">{segment.name}</Text>
                    <Text fontSize="sm" color="content.secondary">
                      ({segment.customerCount || 0} customers)
                    </Text>
                  </HStack>
                  {segment.description && (
                    <Text fontSize="sm" color="content.secondary">
                      {segment.description}
                    </Text>
                  )}
                  <HStack gap="2" alignItems="center">
                    <Text fontSize="xs" color="content.secondary">
                      Type: {segment.type}
                    </Text>
                    <Text fontSize="xs" color="content.secondary">
                      Status: {segment.status}
                    </Text>
                  </HStack>
                </VStack>
              </label>
            );
          })}
        </VStack>
      </CardContent>
    </Card>
  );
} 
