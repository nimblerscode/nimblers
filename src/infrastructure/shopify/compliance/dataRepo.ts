import { Effect, Layer } from "effect";
import {
  type CustomerDataRequestPayload,
  type CustomerRedactPayload,
  ShopifyWebhookError,
  type ShopRedactPayload,
} from "@/domain/shopify/compliance/models";
import { ComplianceDataRepo } from "@/domain/shopify/compliance/service";

export const ComplianceDataRepoLive = Layer.effect(
  ComplianceDataRepo,
  Effect.gen(function* () {
    return {
      retrieveCustomerData: (payload: CustomerDataRequestPayload) =>
        Effect.succeed({
          customerId: payload.customer.id,
          email: payload.customer.email,
          shopId: payload.shop_id,
          ordersRequested: payload.orders_requested,
          message: "Customer data retrieval request processed",
        }).pipe(
          Effect.withSpan("ComplianceDataRepo.retrieveCustomerData"),
          Effect.mapError(
            (error) =>
              new ShopifyWebhookError({
                message: "Failed to retrieve customer data",
                cause: error,
              }),
          ),
        ),

      deleteCustomerData: (payload: CustomerRedactPayload) =>
        Effect.log(
          `Customer data deletion requested for customer ${payload.customer.id} in shop ${payload.shop_id}`,
        ).pipe(
          Effect.withSpan("ComplianceDataRepo.deleteCustomerData"),
          Effect.mapError(
            (error) =>
              new ShopifyWebhookError({
                message: "Failed to delete customer data",
                cause: error,
              }),
          ),
        ),

      deleteShopData: (payload: ShopRedactPayload) =>
        Effect.log(
          `Shop data deletion requested for shop ${payload.shop_id} (${payload.shop_domain})`,
        ).pipe(
          Effect.withSpan("ComplianceDataRepo.deleteShopData"),
          Effect.mapError(
            (error) =>
              new ShopifyWebhookError({
                message: "Failed to delete shop data",
                cause: error,
              }),
          ),
        ),
    };
  }),
);
