"use server";

import { env } from "cloudflare:workers";
import { FetchHttpClient } from "@effect/platform";
import { Effect, Layer } from "effect";
import { GlobalShopConnectionUseCaseLive } from "@/application/global/organization/shopConnectionService";
import { GlobalShopConnectionUseCase } from "@/domain/global/organization/service";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";
import { GlobalShopConnectionRepoLive } from "@/infrastructure/persistence/global/d1/GlobalShopConnectionRepoLive";
import {
  D1BindingLive,
  DrizzleD1ClientLive,
} from "@/infrastructure/persistence/global/d1/drizzle";

export interface ConnectStoreResult {
  success: boolean;
  message: string;
  storeId?: string;
  shopDomain?: string;
  error?: string;
}

export async function connectShopifyStore(
  organizationSlug: string,
  shopDomain: string,
  accessToken: string,
  scope = "read_products,write_products"
): Promise<ConnectStoreResult> {
  const program = Effect.gen(function* () {
    const globalShopService = yield* GlobalShopConnectionUseCase;

    // STEP 1: Global constraint check
    const existingConnection = yield* globalShopService
      .checkShopConnection(shopDomain as any)
      .pipe(Effect.catchAll(() => Effect.succeed(null)));

    if (
      existingConnection &&
      existingConnection.organizationId !== organizationSlug
    ) {
      return {
        success: false,
        message: `Shop '${shopDomain}' is already connected to organization '${existingConnection.organizationId}'. Each Shopify store can only be connected to one organization at a time.`,
        error: "SHOP_ALREADY_CONNECTED",
      };
    }

    // STEP 2: Connect via Organization DO
    const doId = env.ORG_DO.idFromName(organizationSlug);
    const stub = env.ORG_DO.get(doId);
    const client = yield* createOrganizationDOClient(stub);

    const connectResult = yield* client.organizations
      .connectStore({
        payload: {
          type: "shopify",
          shopDomain,
          scope,
          accessToken,
          organizationSlug,
        },
      })
      .pipe(
        Effect.mapError((error) => ({
          success: false,
          message: `Failed to connect store: ${
            error instanceof Error ? error.message : String(error)
          }`,
          error: "STORE_CONNECTION_FAILED",
        }))
      );

    // STEP 3: Create/update global record (if not already exists)
    if (!existingConnection) {
      yield* globalShopService
        .connectShop({
          shopDomain: shopDomain as any,
          organizationId: organizationSlug as any,
          type: "shopify" as const,
          status: "active" as const,
          connectedAt: new Date(),
        })
        .pipe(
          Effect.catchAll((error) => {
            // Log error but don't fail the entire operation since DO connection succeeded
            return Effect.logError(
              `Failed to create global shop connection record: ${error}`
            );
          })
        );
    }

    return {
      success: true,
      message: `Successfully connected ${shopDomain} to ${organizationSlug}`,
      storeId: connectResult.id,
      shopDomain: connectResult.shopDomain,
    };
  });

  // Create the layer stack
  const d1Layer = D1BindingLive({ DB: env.DB });
  const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);
  const globalRepoLayer = Layer.provide(
    GlobalShopConnectionRepoLive,
    drizzleLayer
  );
  const globalUseCaseLayer = Layer.provide(
    GlobalShopConnectionUseCaseLive,
    globalRepoLayer
  );

  try {
    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(Layer.merge(globalUseCaseLayer, FetchHttpClient.layer))
      )
    );
    return result;
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect store: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: "UNEXPECTED_ERROR",
    };
  }
}
