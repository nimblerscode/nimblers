"use server";

import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { ConnectStoreApplicationLayerLive } from "@/config/shopify";
import {
  ConnectStoreApplicationService,
  type ConnectStoreResult,
} from "@/application/shopify/connection/connectStoreService";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { ShopDomain } from "@/domain/shopify/oauth/models";

export type { ConnectStoreResult };

export async function connectShopifyStore(
  organizationSlug: OrganizationSlug,
  shopDomain: ShopDomain
): Promise<ConnectStoreResult> {
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
      })
    )
  );

  return Effect.runPromise(program);
}
