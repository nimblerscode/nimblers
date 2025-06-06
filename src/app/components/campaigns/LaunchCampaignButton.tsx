"use client";

import { useState, useTransition } from "react";
import { Button, VStack, HStack } from "@/app/design-system";
import { css } from "../../../../styled-system/css";
import { launchCampaign } from "@/app/actions/campaigns/launch";
import type { CampaignId } from "@/domain/tenant/campaigns/models";
import type { OrganizationSlug } from "@/domain/global/organization/models";

interface LaunchCampaignButtonProps {
  campaignId: CampaignId;
  organizationSlug: OrganizationSlug;
  campaignName?: string;
  disabled?: boolean;
  onLaunchComplete?: (result: {
    success: boolean;
    totalCustomers: number;
    conversationsCreated: number;
    errors: string[];
  }) => void;
}

export function LaunchCampaignButton({
  campaignId,
  organizationSlug,
  campaignName,
  disabled = false,
  onLaunchComplete,
}: LaunchCampaignButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isLaunching, setIsLaunching] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    totalCustomers: number;
    conversationsCreated: number;
    errors: string[];
  } | null>(null);

  const handleLaunch = async (dryRun = false) => {
    if (isLaunching || isPending) return;

    setIsLaunching(true);

    startTransition(async () => {
      try {
        const result = await launchCampaign(organizationSlug, campaignId, {
          dryRun,
        });

        setLastResult(result);
        onLaunchComplete?.(result);

        // Success/failure handling is done through UI state
      } catch (error) {
        const errorResult = {
          success: false,
          totalCustomers: 0,
          conversationsCreated: 0,
          errors: [error instanceof Error ? error.message : "Unknown error occurred"],
        };
        setLastResult(errorResult);
        onLaunchComplete?.(errorResult);
      } finally {
        setIsLaunching(false);
      }
    });
  };

  const isDisabled = disabled || isLaunching || isPending;

  return (
    <VStack gap="2">
      <HStack gap="2">
        <Button
          onClick={() => handleLaunch(true)}
          isDisabled={isDisabled}
          variant="outline"
          size="sm"
        >
          {isLaunching && isPending ? "Testing..." : "Test Launch"}
        </Button>
        <Button
          onClick={() => handleLaunch(false)}
          isDisabled={isDisabled}
          variant="primary"
          size="sm"
        >
          {isLaunching && isPending ? "Launching..." : "Launch Now"}
        </Button>
      </HStack>

      {lastResult && (
        <div className={css({
          fontSize: "sm",
          padding: "2",
          borderRadius: "md",
          backgroundColor: lastResult.success ? "green.50" : "red.50",
          color: lastResult.success ? "green.700" : "red.700",
          border: "1px solid",
          borderColor: lastResult.success ? "green.200" : "red.200",
        })}>
          {lastResult.success ? (
            <VStack gap="1">
              <p className={css({ fontWeight: "medium" })}>
                {campaignName ? `${campaignName} ` : "Campaign "}
                launched successfully!
              </p>
              <p className={css({ fontSize: "xs" })}>
                {lastResult.totalCustomers} customers, {lastResult.conversationsCreated} conversations created
              </p>
            </VStack>
          ) : (
            <VStack gap="1">
              <p className={css({ fontWeight: "medium" })}>Launch failed</p>
              {lastResult.errors.length > 0 && (
                <ul className={css({
                  fontSize: "xs",
                  listStyleType: "disc",
                  listStylePosition: "inside"
                })}>
                  {lastResult.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </VStack>
          )}
        </div>
      )}
    </VStack>
  );
} 
