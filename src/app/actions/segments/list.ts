"use server";

import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { FetchHttpClient } from "@effect/platform";
import { requestInfo } from "rwsdk/worker";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { Tracing } from "@/tracing";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";

export interface SerializableSegment {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  shopifySegmentId?: string;
  lastSyncAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  customerCount?: number;
}

export async function getSegments(organizationSlug: string): Promise<{
  segments: SerializableSegment[];
}> {
  const program = Effect.gen(function* () {
    // Get user context
    const { ctx } = requestInfo;
    const appCtx = ctx as AppContext;

    if (!appCtx.user) {
      return { segments: [] };
    }

    const segmentProgram = Effect.gen(function* () {
      const orgDONamespace = yield* Effect.succeed(env.ORG_DO);
      const doId = orgDONamespace.idFromName(organizationSlug);
      const stub = orgDONamespace.get(doId);
      const client = yield* createOrganizationDOClient(stub);

      const result = yield* client.organizations.listSegments();
      return result;
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.withSpan("list-segments-in-do", {
        attributes: {
          "organization.slug": organizationSlug,
          "action.type": "list-segments",
        },
      })
    );

    const result = yield* segmentProgram;

    // Convert to serializable format
    const segments: SerializableSegment[] = result.segments.map((segment) => ({
      id: segment.id,
      name: segment.name,
      description: segment.description,
      type: segment.type,
      status: segment.status,
      shopifySegmentId: segment.shopifySegmentId,
      lastSyncAt: segment.lastSyncAt?.toISOString(),
      metadata: segment.metadata
        ? JSON.parse(JSON.stringify(segment.metadata))
        : undefined,
      createdAt: segment.createdAt.toISOString(),
      updatedAt: segment.updatedAt.toISOString(),
      customerCount: (segment as any).customerCount || 0,
    }));

    return { segments };
  }).pipe(
    Effect.provide(Tracing),
    Effect.catchAll((error) => {
      return Effect.gen(function* () {
        yield* Effect.logError("Error in getSegments", { error });
        return { segments: [] };
      });
    })
  );

  return Effect.runPromise(program);
}
