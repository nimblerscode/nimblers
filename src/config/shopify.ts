import { Layer } from "effect";
import { ShopifyComplianceUseCaseLive } from "@/application/global/shopify/compliance/service";
import { ComplianceDataRepoLive } from "@/infrastructure/shopify/compliance/dataRepo";
import { ShopifyHmacVerifierLive } from "@/infrastructure/shopify/compliance/hmac";
import { ComplianceLoggerLive } from "@/infrastructure/shopify/compliance/logger";

/**
 * Complete Shopify compliance layer with all dependencies
 */
export const ShopifyComplianceLayerLive = Layer.provide(
  ShopifyComplianceUseCaseLive,
  Layer.mergeAll(
    ShopifyHmacVerifierLive,
    ComplianceDataRepoLive,
    ComplianceLoggerLive,
  ),
);
