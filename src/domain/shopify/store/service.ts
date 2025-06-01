import { Context, type Effect } from "effect";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { ConnectedStore } from "@/domain/tenant/organization/model";
import type { DrizzleD1Client } from "@/infrastructure/persistence/global/d1/drizzle";
import type { ShopDomain, StoreNotFoundError } from "./models";

// Unified Shopify store service - handles all store-related operations
export abstract class ShopifyStoreService extends Context.Tag(
  "@core/shopify/store/Service",
)<
  ShopifyStoreService,
  {
    // Store discovery and management
    readonly findOrganizationByShop: (
      shopDomain: ShopDomain,
    ) => Effect.Effect<OrganizationSlug, StoreNotFoundError, DrizzleD1Client>;

    readonly getAllOrganizationSlugs: () => Effect.Effect<
      OrganizationSlug[],
      Error,
      DrizzleD1Client
    >;

    // Store connection operations
    readonly checkConnectionStatus: (
      organizationSlug: OrganizationSlug,
      shopDomain: ShopDomain,
    ) => Effect.Effect<{ connected: boolean; scope?: string }, Error>;

    readonly getConnectedStores: (
      organizationSlug: OrganizationSlug,
    ) => Effect.Effect<readonly ConnectedStore[], Error>;

    // Store disconnection (unified method)
    readonly disconnectStore: (
      organizationSlug: OrganizationSlug,
      shopDomain: ShopDomain,
    ) => Effect.Effect<{ success: boolean }, Error>;
  }
>() {}
