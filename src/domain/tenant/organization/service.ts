import type { UserId } from "@/domain/global/user/model";
import { Context, type Effect } from "effect";
import type { NewOrganization, OrgDbError, Organization } from "./model";

// Data needed to create an organization
// References the Organization schema where id is now S.String
export class OrgService extends Context.Tag("core/organization/OrgService")<
  OrgService,
  {
    create: (
      data: NewOrganization,
      creatorUserId: UserId,
    ) => Effect.Effect<Organization, OrgDbError>;
  }
>() {}
