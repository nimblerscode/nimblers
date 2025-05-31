"use server";

import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { ComplianceWebhookApplicationService } from "@/application/shopify/compliance/webhookService";
import type { WebhookType } from "@/domain/shopify/compliance/models";

export async function handleShopifyComplianceWebhook(
  webhookType: WebhookType,
  request: Request
): Promise<Response> {
  return Effect.runPromise(
    ComplianceWebhookApplicationService.handleShopifyComplianceWebhook(
      webhookType,
      request,
      env.SHOPIFY_WEBHOOK_SECRET
    )
  );
}
