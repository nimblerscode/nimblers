import type { UserId } from "@/domain/global/user/model";
import type { NewOrganization } from "@/domain/tenant/organization/model";
import { OrgService } from "@/domain/tenant/organization/service";
import { Effect } from "effect";

export const create = (input: NewOrganization, creatorId: UserId) =>
  Effect.gen(function* () {
    const orgService = yield* OrgService;

    const org = yield* orgService.create(input, creatorId);

    return org;
  });
