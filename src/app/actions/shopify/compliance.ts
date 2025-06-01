"use server";

import { env } from "cloudflare:workers";
import { Effect, pipe } from "effect";
import { ComplianceWebhookLayerLive } from "@/config/shopify";
import type { WebhookType } from "@/domain/shopify/compliance/models";
import { ComplianceWebhookService } from "@/domain/shopify/compliance/service";

export async function handleShopifyComplianceWebhook(
  webhookType: WebhookType,
  request: Request,
): Promise<Response> {
  const program = pipe(
    Effect.gen(function* () {
      const webhookService = yield* ComplianceWebhookService;
      return yield* webhookService.handleShopifyComplianceWebhook(
        webhookType,
        request,
        env.SHOPIFY_WEBHOOK_SECRET,
      );
    }),
    Effect.provide(ComplianceWebhookLayerLive),
  );

  return Effect.runPromise(program);
}
