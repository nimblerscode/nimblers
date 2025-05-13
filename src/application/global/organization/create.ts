import type {
  NewOrganizationD1,
  OrgDbError,
  OrganizationD1,
} from "@/domain/global/organization/model";
import { OrgD1Service } from "@/domain/global/organization/service";
import { Effect } from "effect";

export const create = (
  organizationData: NewOrganizationD1,
): Effect.Effect<OrganizationD1, OrgDbError, OrgD1Service> =>
  Effect.gen(function* () {
    const orgService = yield* OrgD1Service;
    return yield* orgService.create(organizationData);
  }).pipe(Effect.withSpan("create"));
