import { Context, type Effect } from "effect";
import type { UserId } from "../user/model";
import type {
  NewOrganizationD1,
  OrganizationD1,
  OrganizationWithMembership,
  OrgDbError,
} from "./model";
import type {
  NewShopConnection,
  OrganizationSlug,
  ShopAlreadyConnectedError,
  ShopConnection,
  ShopConnectionError,
  ShopDomain,
} from "./models";

// === Organization D1 Repository ===
export abstract class OrgD1Repo extends Context.Tag("@core/OrgD1Repo")<
  OrgD1Repo,
  {
    readonly create: (
      organization: NewOrganizationD1
    ) => Effect.Effect<OrganizationD1, OrgDbError>;
    readonly getOrgById: (
      id: string
    ) => Effect.Effect<OrganizationD1, OrgDbError>;
    readonly getOrgBySlug: (
      slug: OrganizationSlug
    ) => Effect.Effect<OrganizationD1, OrgDbError>;
    readonly verifyUserOrgMembership: (
      slug: OrganizationSlug,
      userId: UserId
    ) => Effect.Effect<OrganizationSlug, OrgDbError>;
    readonly getOrganizationsForUser: (
      userId: UserId
    ) => Effect.Effect<OrganizationWithMembership[], OrgDbError>;
  }
>() {}

// === Organization D1 Service ===
export abstract class OrgD1Service extends Context.Tag("@core/OrgD1Service")<
  OrgD1Service,
  {
    readonly create: (
      organization: NewOrganizationD1
    ) => Effect.Effect<OrganizationD1, OrgDbError>;
    readonly getOrgById: (
      id: string
    ) => Effect.Effect<OrganizationD1, OrgDbError>;
    readonly getOrgBySlug: (
      slug: OrganizationSlug
    ) => Effect.Effect<OrganizationD1, OrgDbError>;
    readonly verifyUserOrgMembership: (
      slug: OrganizationSlug,
      userId: UserId
    ) => Effect.Effect<OrganizationSlug, OrgDbError>;
    readonly getOrganizationsForUser: (
      userId: UserId
    ) => Effect.Effect<OrganizationWithMembership[], OrgDbError>;
  }
>() {}

// Database error for infrastructure layer
export class GlobalDbError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "GlobalDbError";
  }
}

// === Global Shop Connection Repository ===
export abstract class GlobalShopConnectionRepo extends Context.Tag(
  "@global/organization/ShopConnectionRepo"
)<
  GlobalShopConnectionRepo,
  {
    readonly create: (
      connection: NewShopConnection
    ) => Effect.Effect<ShopConnection, GlobalDbError>;
    readonly getByShopDomain: (
      shopDomain: ShopDomain
    ) => Effect.Effect<ShopConnection | null, GlobalDbError>;
    readonly deleteByShopDomain: (
      shopDomain: ShopDomain
    ) => Effect.Effect<boolean, GlobalDbError>;
    readonly getByOrganizationSlug: (
      organizationSlug: OrganizationSlug
    ) => Effect.Effect<ShopConnection[], GlobalDbError>;
  }
>() {}

// === Global Shop Connection Use Case ===
export abstract class GlobalShopConnectionUseCase extends Context.Tag(
  "@global/organization/ShopConnectionUseCase"
)<
  GlobalShopConnectionUseCase,
  {
    readonly connectShop: (
      connection: NewShopConnection
    ) => Effect.Effect<
      ShopConnection,
      ShopAlreadyConnectedError | ShopConnectionError
    >;
    readonly disconnectShop: (
      shopDomain: ShopDomain
    ) => Effect.Effect<boolean, ShopConnectionError>;
    readonly checkShopConnection: (
      shopDomain: ShopDomain
    ) => Effect.Effect<ShopConnection | null, ShopConnectionError>;
    readonly getOrganizationShops: (
      organizationSlug: OrganizationSlug
    ) => Effect.Effect<ShopConnection[], ShopConnectionError>;
  }
>() {}
