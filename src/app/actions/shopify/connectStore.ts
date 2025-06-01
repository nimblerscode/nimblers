"use server";

import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { ConnectStoreApplicationLayerLive } from "@/config/shopify";
import {
  ConnectStoreApplicationService,
  type ConnectStoreResult,
} from "@/application/shopify/connection/connectStoreService";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import { D1BindingLive } from "@/infrastructure/persistence/global/d1/drizzle";
import { DrizzleD1ClientLive } from "@/infrastructure/persistence/global/d1/drizzle";

export type { ConnectStoreResult };

export async function connectShopifyStore(
  organizationSlug: OrganizationSlug,
  shopDomain: ShopDomain
): Promise<ConnectStoreResult> {
  const d1Layer = D1BindingLive(env);
  const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);
  const program = Effect.gen(function* () {
    const service = yield* ConnectStoreApplicationService;
    return yield* service.connectShopifyStore({
      organizationSlug,
      shopDomain,
    });
  }).pipe(
    Effect.provide(
      ConnectStoreApplicationLayerLive({
        ORG_DO: env.ORG_DO,
        DB: env.DB,
      }).pipe(Layer.provide(drizzleLayer))
    )
  );

  return Effect.runPromise(program);
}
