import { Context, type Effect } from "effect";
import type { OrganizationId } from "@/domain/tenant/organization/model";
import type {
  NewOrganizationD1,
  OrganizationD1,
  OrgDbError,
  OrgNotFoundError,
} from "./model";

export class OrgD1Service extends Context.Tag("core/organization/OrgD1Service")<
  OrgD1Service,
  {
    create: (
      org: NewOrganizationD1
    ) => Effect.Effect<OrganizationD1, OrgDbError>;
    getOrgIdBySlug: (
      slug: string,
      userId: string
    ) => Effect.Effect<string, OrgNotFoundError | OrgDbError>;
    getOrgById: (
      id: OrganizationId
    ) => Effect.Effect<OrganizationD1, OrgNotFoundError | OrgDbError>;
  }
>() {}
