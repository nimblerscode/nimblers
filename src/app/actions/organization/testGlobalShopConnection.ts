"use server";

import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { GlobalShopConnectionUseCaseLive } from "@/application/global/organization/shopConnectionService";
import { GlobalShopConnectionRepoLive } from "@/infrastructure/persistence/global/d1/GlobalShopConnectionRepoLive";
import {
  D1BindingLive,
  DrizzleD1ClientLive,
} from "@/infrastructure/persistence/global/d1/drizzle";
import { GlobalShopConnectionUseCase } from "@/domain/global/organization/service";

export async function testGlobalShopConnection(
  shopDomain: string,
  organizationId: string
): Promise<{
  success: boolean;
  message: string;
  existingConnection?: any;
}> {
  const program = Effect.gen(function* () {
    const globalShopService = yield* GlobalShopConnectionUseCase;

    // Check if shop is already connected
    const existingConnection = yield* globalShopService.checkShopConnection(
      shopDomain as any
    );

    if (existingConnection) {
      return {
        success: false,
        message: `Shop ${shopDomain} is already connected to organization ${existingConnection.organizationId}`,
        existingConnection,
      };
    }

    // Try to connect the shop
    const newConnection = yield* globalShopService.connectShop({
      shopDomain: shopDomain as any,
      organizationId: organizationId as any,
      type: "shopify" as const,
      status: "active" as const,
      connectedAt: new Date(),
    });

    return {
      success: true,
      message: `Successfully connected shop ${shopDomain} to organization ${organizationId}`,
      existingConnection: newConnection,
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
    return {
      success: false,
      message: `Error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
