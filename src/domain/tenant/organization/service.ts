import { Context, type Effect } from "effect";
import type {
  OrganizationSlug,
  ShopDomain,
} from "@/domain/global/organization/models";
import type { UserId } from "@/domain/global/user/model";
import type {
  ConnectedStore,
  NewConnectedStore,
  NewOrganization,
  Organization,
  OrganizationId,
  OrganizationWithStores,
  OrgDbError,
} from "./model";
import type { OrganizationProvisionError } from "./provision/service";

// ===== Domain Services =====

/**
 * Core domain service for organization management
 */
export class OrgService extends Context.Tag("core/organization/OrgService")<
  OrgService,
  {
    get: (slug: OrganizationSlug) => Effect.Effect<Organization, OrgDbError>;
    create: (
      data: NewOrganization,
      creatorUserId: UserId,
    ) => Effect.Effect<Organization, OrgDbError>;
  }
>() {}

// ===== Infrastructure Service Dependencies =====

/**
 * Repository service for basic organization persistence
 */
export class OrgRepositoryService extends Context.Tag(
  "domain/services/OrgRepository",
)<
  OrgRepositoryService,
  {
    get: (slug: OrganizationSlug) => Effect.Effect<Organization, OrgDbError>;
    create: (org: {
      name: string;
      id: OrganizationId;
      creatorId: UserId;
    }) => Effect.Effect<void, OrgDbError>;
  }
>() {}

/**
 * Durable Object service for distributed organization operations
 */
export class OrganizationDOService extends Context.Tag(
  "domain/services/OrganizationDO",
)<
  OrganizationDOService,
  {
    getOrganization: (
      slug: OrganizationSlug,
    ) => Effect.Effect<Organization, OrgDbError>;
    createOrganization: (
      organization: NewOrganization,
      creatorId: UserId,
    ) => Effect.Effect<Organization, OrganizationProvisionError>;
    // Add other methods if your domain requires them
    // updateOrganization: (id: string, data: Partial<NewOrganization>) => ...
  }
>() {}

export abstract class OrganizationRepo extends Context.Tag(
  "@core/OrganizationRepo",
)<
  OrganizationRepo,
  {
    readonly createOrg: (
      data: NewOrganization,
      creatorUserId: UserId,
    ) => Effect.Effect<
      { org: Organization; memberCreateData: any },
      OrgDbError,
      never
    >;
    readonly getOrgBySlug: (
      slug: OrganizationSlug,
    ) => Effect.Effect<Organization, OrgDbError>;
  }
>() {}

// Connected Store Repository
export abstract class ConnectedStoreRepo extends Context.Tag(
  "@core/ConnectedStoreRepo",
)<
  ConnectedStoreRepo,
  {
    readonly create: (
      store: NewConnectedStore,
    ) => Effect.Effect<ConnectedStore, OrgDbError>;
    readonly upsert: (
      store: NewConnectedStore,
    ) => Effect.Effect<ConnectedStore, OrgDbError>;
    readonly getByOrganizationId: (
      organizationId: OrganizationId,
    ) => Effect.Effect<ConnectedStore[], OrgDbError>;
    readonly getByShopDomain: (
      shopDomain: string,
    ) => Effect.Effect<ConnectedStore | null, OrgDbError>;
    readonly getByOrganizationAndShop: (
      organizationId: OrganizationId,
      shopDomain: string,
    ) => Effect.Effect<ConnectedStore | null, OrgDbError>;
    readonly updateStatus: (
      storeId: string,
      status: ConnectedStore["status"],
    ) => Effect.Effect<void, OrgDbError>;
    readonly delete: (storeId: string) => Effect.Effect<void, OrgDbError>;
  }
>() {}

export abstract class OrganizationUseCase extends Context.Tag(
  "@core/OrganizationUseCase",
)<
  OrganizationUseCase,
  {
    readonly createOrg: (
      data: NewOrganization,
      creatorUserId: UserId,
    ) => Effect.Effect<
      { org: Organization; memberCreateData: any },
      OrgDbError
    >;
    readonly getOrgBySlug: (
      slug: OrganizationSlug,
    ) => Effect.Effect<Organization, OrgDbError>;
    readonly getOrgWithStores: (
      slug: OrganizationSlug,
    ) => Effect.Effect<OrganizationWithStores, OrgDbError>;
    readonly connectStore: (
      organizationId: OrganizationId,
      storeData: Omit<NewConnectedStore, "organizationId">,
    ) => Effect.Effect<ConnectedStore, OrgDbError>;
    readonly disconnectStore: (
      shopDomain: ShopDomain,
    ) => Effect.Effect<void, OrgDbError>;
    readonly getConnectedStores: (
      organizationId: OrganizationId,
    ) => Effect.Effect<ConnectedStore[], OrgDbError>;
  }
>() {}
