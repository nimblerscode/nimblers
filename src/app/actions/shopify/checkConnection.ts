"use server";

import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { ShopConnectionCheckLayerLive } from "@/config/shopify";
import {
  ShopConnectionCheckService,
  type ShopConnectionCheckResult,
} from "@/application/shopify/connection/checkConnectionService";
import type { ShopDomain } from "@/domain/shopify/oauth/models";
import type { OrganizationSlug } from "@/domain/global/organization/models";

export type { ShopConnectionCheckResult };

export async function checkShopConnection(
  shopDomain: ShopDomain,
  organizationId: OrganizationSlug
): Promise<ShopConnectionCheckResult> {
  const program = Effect.gen(function* () {
    const service = yield* ShopConnectionCheckService;
    return yield* service.checkShopConnection(shopDomain, organizationId);
  }).pipe(Effect.provide(ShopConnectionCheckLayerLive({ DB: env.DB })));

  return Effect.runPromise(program);
}
