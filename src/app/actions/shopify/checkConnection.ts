"use server";

import { env } from "cloudflare:workers";
import { Effect } from "effect";
import {
  type ShopConnectionCheckResult,
  ShopConnectionCheckService,
} from "@/application/shopify/connection/checkConnectionService";
import { ShopConnectionCheckLayerLive } from "@/config/shopify";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { ShopDomain } from "@/domain/shopify/oauth/models";

export type { ShopConnectionCheckResult };

export async function checkShopConnection(
  shopDomain: ShopDomain,
  organizationId: OrganizationSlug,
): Promise<ShopConnectionCheckResult> {
  const program = Effect.gen(function* () {
    const service = yield* ShopConnectionCheckService;
    return yield* service.checkShopConnection(shopDomain, organizationId);
  }).pipe(Effect.provide(ShopConnectionCheckLayerLive({ DB: env.DB })));

  return Effect.runPromise(program);
}
