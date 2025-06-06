"use server";

import { env } from "cloudflare:workers";
import { Effect, pipe } from "effect";
import type { CampaignId } from "@/domain/tenant/campaigns/models";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";
import { OrganizationDONamespace } from "@/infrastructure/cloudflare/durable-objects/OrganizationDONameSpace";
import { FetchHttpClient } from "@effect/platform";
import { Layer } from "effect";

export async function launchCampaign(
  organizationSlug: OrganizationSlug,
  campaignId: CampaignId,
  options?: {
    dryRun?: boolean;
  }
): Promise<{
  success: boolean;
  totalCustomers: number;
  conversationsCreated: number;
  errors: string[];
}> {
  const program = pipe(
    Effect.gen(function* () {
      // Get Organization DO client
      const orgDONamespace = yield* OrganizationDONamespace;
      const doId = orgDONamespace.idFromName(organizationSlug);
      const stub = orgDONamespace.get(doId);
      const client = yield* createOrganizationDOClient(stub);

      yield* Effect.logInfo("Launching campaign", {
        organizationSlug,
        campaignId,
        dryRun: options?.dryRun || false,
      });

      // Call the launch campaign endpoint via DO client
      const result = yield* client.organizations.launchCampaign({
        path: { campaignId },
        payload: {
          organizationSlug,
          dryRun: options?.dryRun,
        },
      });

      yield* Effect.logInfo("Campaign launch completed", {
        campaignId,
        result,
      });

      // Convert readonly arrays to mutable for return type compatibility
      return {
        success: result.success,
        totalCustomers: result.totalCustomers,
        conversationsCreated: result.conversationsCreated,
        errors: [...result.errors], // Convert readonly to mutable
      };
    }),
    Effect.provide(
      Layer.mergeAll(
        Layer.succeed(OrganizationDONamespace, env.ORG_DO),
        FetchHttpClient.layer
      )
    ),
    Effect.catchAll((error) => {
      return Effect.gen(function* () {
        // Handle different error types safely
        const errorMessage =
          "message" in error && typeof error.message === "string"
            ? error.message
            : String(error);

        yield* Effect.logError("Campaign launch failed", {
          campaignId,
          organizationSlug,
          error: errorMessage,
        });

        // Return a graceful failure response
        return {
          success: false,
          totalCustomers: 0,
          conversationsCreated: 0,
          errors: [`Failed to launch campaign: ${errorMessage}`],
        };
      });
    })
  );

  return Effect.runPromise(program);
}
