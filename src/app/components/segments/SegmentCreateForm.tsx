"use client";

import { useActionState, useState } from "react";
import {
  Banner,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectItem,
  TextField,
  VStack,
} from "@/app/design-system";
import {
  createSegmentAction,
  type CreateSegmentState,
} from "@/app/actions/segments/create";
import { CustomerSelectionStep } from "./CustomerSelectionStep";

const SEGMENT_TYPES = [
  {
    id: "manual",
    label: "Manual",
    description: "Manually add and remove customers",
  },
  {
    id: "automatic",
    label: "Automatic",
    description: "Automatically include customers based on conditions",
  },
  {
    id: "shopify_sync",
    label: "Shopify Sync",
    description: "Sync with a Shopify customer segment",
  },
];

interface SegmentCreateFormProps {
  organizationSlug: string;
}

export function SegmentCreateForm({ organizationSlug }: SegmentCreateFormProps) {
  const initialState: CreateSegmentState = {
    success: false,
    message: "",
    errors: null,
    user: { id: "unknown" },
  };

  const [state, formAction, pending] = useActionState(
    createSegmentAction,
    initialState,
  );

  const [selectedSegmentType, setSelectedSegmentType] = useState<string>("manual");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Custom form action wrapper to include selected customer IDs
  const handleFormAction = async (formData: FormData) => {
    // Add selected customer IDs to form data
    formData.set("customerIds", JSON.stringify(selectedCustomerIds));
    return formAction(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segment Details</CardTitle>
      </CardHeader>

      <CardContent>
        <form action={handleFormAction}>
          <VStack gap="6" alignItems="stretch">
            {/* Hidden field for organization slug */}
            <input type="hidden" name="organizationSlug" value={organizationSlug} />

            {/* Success Message */}
            {state.success && (
              <Banner variant="success" icon={true}>
                {state.message}
              </Banner>
            )}

            {/* Error Message */}
            {state.errors && !state.success && (
              <Banner variant="danger" icon={true} title="Segment Creation Failed">
                {state.message || "Failed to create segment. Please try again."}
              </Banner>
            )}

            {/* Segment Name */}
            <TextField
              name="name"
              label="Segment Name"
              inputProps={{
                placeholder: "VIP Customers",
                required: true,
                disabled: pending,
                variantSize: "lg",
              }}
              description="Choose a descriptive name for your segment"
            />

            {/* Segment Description */}
            <TextField
              name="description"
              label="Description (Optional)"
              inputProps={{
                placeholder: "Describe your segment criteria and purpose...",
                disabled: pending,
                variantSize: "lg",
              }}
              description="Add details about your segment criteria and purpose"
            />

            {/* Segment Type */}
            <VStack gap="2" alignItems="stretch">
              <Select
                label="Segment Type"
                placeholder="Select segment type"
                selectedKey={selectedSegmentType}
                onSelectionChange={(key) => setSelectedSegmentType(String(key))}
                isDisabled={pending}
                description="Choose how customers will be added to this segment"
              >
                {SEGMENT_TYPES.map((type) => (
                  <SelectItem key={type.id} id={type.id} textValue={type.label}>
                    <VStack gap="1" alignItems="flex-start">
                      <span>{type.label}</span>
                      <span style={{ fontSize: "0.875rem", color: "var(--colors-content-secondary)" }}>
                        {type.description}
                      </span>
                    </VStack>
                  </SelectItem>
                ))}
              </Select>
              <input type="hidden" name="type" value={selectedSegmentType} />
            </VStack>

            {/* Customer Selection - Only for manual segments */}
            {selectedSegmentType === "manual" && (
              <CustomerSelectionStep
                organizationSlug={organizationSlug}
                selectedCustomerIds={selectedCustomerIds}
                onSelectionChange={setSelectedCustomerIds}
              />
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isDisabled={pending}
            >
              {pending ? "Creating Segment..." : "Create Segment"}
            </Button>
          </VStack>
        </form>
      </CardContent>
    </Card>
  );
} 
