import { Context, type Effect } from "effect";
import type { UserId } from "@/domain/global/user/model";
import type { NewOrganization, Organization, OrgDbError } from "./model";
import type { OrganizationProvisionError } from "./provision/service";

// ===== Domain Services =====

/**
 * Core domain service for organization management
 */
export class OrgService extends Context.Tag("core/organization/OrgService")<
  OrgService,
  {
    create: (
      data: NewOrganization,
      creatorUserId: UserId
    ) => Effect.Effect<Organization, OrgDbError>;
  }
>() {}

// ===== Infrastructure Service Dependencies =====

/**
 * Repository service for basic organization persistence
 */
export class OrgRepositoryService extends Context.Tag(
  "domain/services/OrgRepository"
)<
  OrgRepositoryService,
  {
    create: (org: {
      name: string;
      id: string;
      creatorId: string;
    }) => Effect.Effect<void, OrgDbError>;
  }
>() {}

/**
 * Durable Object service for distributed organization operations
 */
export class OrganizationDOService extends Context.Tag(
  "domain/services/OrganizationDO"
)<
  OrganizationDOService,
  {
    createOrganization: (
      organization: NewOrganization,
      creatorId: UserId
    ) => Effect.Effect<Organization, OrganizationProvisionError>;
    // Add other methods if your domain requires them
    // updateOrganization: (id: string, data: Partial<NewOrganization>) => ...
  }
>() {}
