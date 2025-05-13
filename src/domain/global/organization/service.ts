import type { OrganizationId } from "@/domain/tenant/organization/model";
import { Context, type Effect } from "effect";
import type {
  NewOrganizationD1,
  OrgDbError,
  OrgNotFoundError,
  OrganizationD1,
} from "./model";

export class OrgD1Service extends Context.Tag("core/organization/OrgD1Service")<
  OrgD1Service,
  {
    create: (
      org: NewOrganizationD1,
    ) => Effect.Effect<OrganizationD1, OrgDbError>;
    getOrgById: (
      id: OrganizationId,
    ) => Effect.Effect<OrganizationD1, OrgNotFoundError | OrgDbError>;
  }
>() {}
