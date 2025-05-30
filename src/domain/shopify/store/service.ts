import { Context, type Effect } from "effect";
import type { DrizzleD1Client } from "@/infrastructure/persistence/global/d1/drizzle";
import type {
  ConnectedStore,
  NewConnectedStore,
  OrganizationId,
  ShopDomain,
  StoreConnectionError,
  StoreAlreadyConnectedError,
  StoreDbError,
  StoreId,
  StoreNotFoundError,
} from "./models";

// === Connected Store Repository ===
export abstract class ConnectedStoreRepo extends Context.Tag(
  "@core/shopify/store/ConnectedStoreRepo"
)<
  ConnectedStoreRepo,
  {
    readonly create: (
      store: NewConnectedStore
    ) => Effect.Effect<ConnectedStore, StoreDbError>;
    readonly upsert: (
      store: NewConnectedStore
    ) => Effect.Effect<ConnectedStore, StoreDbError>;
    readonly getByOrganizationId: (
      organizationId: OrganizationId
    ) => Effect.Effect<ConnectedStore[], StoreDbError>;
    readonly getByShopDomain: (
      shopDomain: ShopDomain
    ) => Effect.Effect<ConnectedStore | null, StoreDbError>;
    readonly getByOrganizationAndShop: (
      organizationId: OrganizationId,
      shopDomain: ShopDomain
    ) => Effect.Effect<ConnectedStore | null, StoreDbError>;
    readonly updateStatus: (
      storeId: StoreId,
      status: ConnectedStore["status"]
    ) => Effect.Effect<ConnectedStore, StoreDbError | StoreNotFoundError>;
    readonly delete: (storeId: StoreId) => Effect.Effect<boolean, StoreDbError>;
  }
>() {}

// === Store Connection Use Case ===
export abstract class StoreConnectionUseCase extends Context.Tag(
  "@core/shopify/store/StoreConnectionUseCase"
)<
  StoreConnectionUseCase,
  {
    readonly connectStore: (
      organizationId: OrganizationId,
      shopDomain: ShopDomain,
      scope: string
    ) => Effect.Effect<
      ConnectedStore,
      StoreConnectionError | StoreAlreadyConnectedError | StoreDbError
    >;
    readonly disconnectStore: (
      organizationId: OrganizationId,
      shopDomain: ShopDomain
    ) => Effect.Effect<boolean, StoreNotFoundError | StoreDbError>;
    readonly getOrganizationStores: (
      organizationId: OrganizationId
    ) => Effect.Effect<ConnectedStore[], StoreDbError>;
    readonly getStoreByDomain: (
      shopDomain: ShopDomain
    ) => Effect.Effect<ConnectedStore | null, StoreDbError>;
    readonly updateStoreStatus: (
      organizationId: OrganizationId,
      shopDomain: ShopDomain,
      status: ConnectedStore["status"]
    ) => Effect.Effect<ConnectedStore, StoreNotFoundError | StoreDbError>;
  }
>() {}

// Store management service - handles organization-level store operations
export abstract class StoreManagementService extends Context.Tag(
  "@core/shopify/store/Management"
)<
  StoreManagementService,
  {
    readonly findOrganizationByShop: (
      shopDomain: ShopDomain
    ) => Effect.Effect<string, StoreNotFoundError | Error, DrizzleD1Client>;

    readonly disconnectStoreFromOrganization: (
      organizationSlug: string,
      shopDomain: ShopDomain
    ) => Effect.Effect<boolean, StoreNotFoundError | Error, never>;

    readonly getAllOrganizationSlugs: () => Effect.Effect<
      string[],
      Error,
      DrizzleD1Client
    >;
  }
>() {}

// Store connection status service
export abstract class StoreConnectionService extends Context.Tag(
  "@core/shopify/store/Connection"
)<
  StoreConnectionService,
  {
    readonly checkConnectionStatus: (
      organizationSlug: string,
      shopDomain: ShopDomain
    ) => Effect.Effect<{ connected: boolean; scope?: string }, Error>;

    readonly disconnectStore: (
      organizationSlug: string,
      shopDomain: ShopDomain
    ) => Effect.Effect<{ success: boolean }, Error>;
  }
>() {}
