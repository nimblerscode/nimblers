"use server";

import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { GlobalShopConnectionUseCaseLive } from "@/application/global/organization/shopConnectionService";
import { GlobalShopConnectionUseCase } from "@/domain/global/organization/service";
import { GlobalShopConnectionRepoLive } from "@/infrastructure/persistence/global/d1/GlobalShopConnectionRepoLive";
import {
  D1BindingLive,
  DrizzleD1ClientLive,
} from "@/infrastructure/persistence/global/d1/drizzle";

export interface ShopConnectionCheckResult {
  canConnect: boolean;
  isConnected: boolean;
  connectedToOrganization?: string;
  message?: string;
}

export async function checkShopConnection(
  shopDomain: string,
  organizationId: string
): Promise<ShopConnectionCheckResult> {
  const program = Effect.gen(function* () {
    const globalShopService = yield* GlobalShopConnectionUseCase;

    // Check if shop is already connected to any organization
    const existingConnection = yield* globalShopService.checkShopConnection(
      shopDomain as any
    );

    if (!existingConnection) {
      // Shop is not connected to any organization - can connect
      return {
        canConnect: true,
        isConnected: false,
        message: `Shop ${shopDomain} is available for connection`,
      };
    }

    if (existingConnection.organizationId === organizationId) {
      // Shop is already connected to THIS organization
      return {
        canConnect: false,
        isConnected: true,
        connectedToOrganization: organizationId,
        message: `Shop ${shopDomain} is already connected to this organization`,
      };
    }

    // Shop is connected to a DIFFERENT organization
    return {
      canConnect: false,
      isConnected: true,
      connectedToOrganization: existingConnection.organizationId,
      message: `Shop ${shopDomain} is already connected to organization '${existingConnection.organizationId}'. Each Shopify store can only be connected to one organization at a time.`,
    };
  });

  // Create the layer stack
  const d1Layer = D1BindingLive({ DB: env.DB });
  const drizzleLayer = Layer.provide(DrizzleD1ClientLive, d1Layer);
  const repoLayer = Layer.provide(GlobalShopConnectionRepoLive, drizzleLayer);
  const useCaseLayer = Layer.provide(
    GlobalShopConnectionUseCaseLive,
    repoLayer
  );

  try {
    const result = await Effect.runPromise(
      program.pipe(Effect.provide(useCaseLayer))
    );
    return result;
  } catch (error) {
    // On error, allow connection but log the issue
    return {
      canConnect: true,
      isConnected: false,
      message:
        "Unable to verify shop connection status, proceeding with connection attempt",
    };
  }
}
