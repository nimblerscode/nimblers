"use server";

import { env } from "cloudflare:workers";
import { Effect, pipe } from "effect";
import { FetchHttpClient } from "@effect/platform";
import { requestInfo } from "rwsdk/worker";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { Tracing } from "@/tracing";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";
import type { OrganizationSlug } from "@/domain/tenant/shared/branded-types";
import type { SegmentId } from "@/domain/tenant/segments/models";
import type { CustomerId } from "@/domain/tenant/customers/models";

export async function addCustomersToSegmentAction(
  organizationSlug: OrganizationSlug,
  segmentId: SegmentId,
  customerIds: CustomerId[]
): Promise<{ success: boolean; error?: string; message?: string }> {
  const program = pipe(
    Effect.gen(function* () {
      // Get user context
      const { ctx } = requestInfo;
      const appCtx = ctx as AppContext;

      if (!appCtx.user) {
        return {
          success: false,
          error: "User not authenticated",
        };
      }

      const addToSegmentProgram = Effect.gen(function* () {
        const orgDONamespace = yield* Effect.succeed(env.ORG_DO);
        const doId = orgDONamespace.idFromName(organizationSlug);
        const stub = orgDONamespace.get(doId);
        const client = yield* createOrganizationDOClient(stub);

        const result = yield* client.organizations.addCustomersToSegment({
          payload: {
            segmentId,
            customerIds,
            source: "manual",
          },
        });

        return {
          success: true,
          message: `Successfully added ${result.addedCount} customer${
            result.addedCount === 1 ? "" : "s"
          } to segment`,
          addedCount: result.addedCount,
        };
      }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.withSpan("add-customers-to-segment-in-do", {
          attributes: {
            "organization.slug": organizationSlug,
            "action.type": "add-customers-to-segment",
            "segment.id": segmentId,
            "customer.count": customerIds.length,
          },
        })
      );

      const result = yield* addToSegmentProgram;
      return {
        success: result.success,
        message: result.message,
      };
    }),
    Effect.provide(Tracing),
    Effect.catchAll((error) => {
      return Effect.gen(function* () {
        yield* Effect.logError("Error in addCustomersToSegmentAction", {
          error,
        });
        return {
          success: false,
          error: "Failed to add customers to segment",
        };
      });
    })
  );

  return Effect.runPromise(program);
}
