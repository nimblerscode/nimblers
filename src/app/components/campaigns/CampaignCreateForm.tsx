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
  createCampaignAction,
  type CreateCampaignState,
} from "@/app/actions/campaigns/create";
import { CAMPAIGN_TYPES, TIMEZONES } from "./timezones";

interface CampaignCreateFormProps {
  organizationSlug: string;
}

export function CampaignCreateForm({ organizationSlug }: CampaignCreateFormProps) {
  const initialState: CreateCampaignState = {
    success: false,
    message: "",
    errors: null,
    user: { id: "unknown" },
  };

  const [state, formAction, pending] = useActionState(
    createCampaignAction,
    initialState,
  );

  const [selectedCampaignType, setSelectedCampaignType] = useState<string>("sms");
  const [selectedTimezone, setSelectedTimezone] = useState<string>("America/New_York");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Details</CardTitle>
      </CardHeader>

      <CardContent>
        <form action={formAction}>
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
              <Banner variant="danger" icon={true} title="Campaign Creation Failed">
                {state.message || "Failed to create campaign. Please try again."}
              </Banner>
            )}

            {/* Campaign Name */}
            <TextField
              name="name"
              label="Campaign Name"
              inputProps={{
                placeholder: "Black Friday Sale 2024",
                required: true,
                disabled: pending,
                variantSize: "lg",
              }}
              description="Choose a descriptive name for your campaign"
            />

            {/* Campaign Description */}
            <TextField
              name="description"
              label="Description (Optional)"
              inputProps={{
                placeholder: "Describe your campaign goals and target audience...",
                disabled: pending,
                variantSize: "lg",
              }}
              description="Add details about your campaign purpose and strategy"
            />

            {/* Campaign Type */}
            <VStack gap="2" alignItems="stretch">
              <Select
                label="Campaign Type"
                placeholder="Select campaign type"
                selectedKey={selectedCampaignType}
                onSelectionChange={(key) => setSelectedCampaignType(String(key))}
                isDisabled={pending}
                description="Choose how you want to reach your customers"
              >
                {CAMPAIGN_TYPES.map((type) => (
                  <SelectItem key={type.id} id={type.id} textValue={type.label}>
                    {type.label}
                  </SelectItem>
                ))}
              </Select>
              <input type="hidden" name="campaignType" value={selectedCampaignType} />
            </VStack>

            {/* Timezone */}
            <VStack gap="2" alignItems="stretch">
              <Select
                label="Timezone"
                placeholder="Select timezone"
                selectedKey={selectedTimezone}
                onSelectionChange={(key) => setSelectedTimezone(String(key))}
                isDisabled={pending}
                description="Campaign scheduling will use this timezone"
              >
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.id} id={tz.id} textValue={tz.label}>
                    {tz.label}
                  </SelectItem>
                ))}
              </Select>
              <input type="hidden" name="timezone" value={selectedTimezone} />
            </VStack>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isDisabled={pending}
            >
              {pending ? "Creating Campaign..." : "Create Campaign"}
            </Button>
          </VStack>
        </form>
      </CardContent>
    </Card>
  );
} 
