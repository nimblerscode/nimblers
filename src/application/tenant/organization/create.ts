import type { UserId } from "@/domain/global/user/model";
import type { NewOrganization } from "@/domain/tenant/organization/model";
import { OrgService } from "@/domain/tenant/organization/service";
import { Effect } from "effect";

export const createOrg = (input: NewOrganization, creatorId: UserId) =>
  Effect.gen(function* () {
    const orgService = yield* OrgService;
    // const memberRepo = yield* _(MemberRepo); // If needed

    // 1. Create the organization record
    // The input already matches OrgCreateData after picking relevant fields
    const orgCreationData = {
      name: input.name,
      slug: input.slug,
      logo: input.logo,
      creatorId: creatorId,
      // id and createdAt are handled by the repository layer
    };
    const organization = yield* orgService.createOrg(
      orgCreationData,
      creatorId,
    );

    // 2. Initial member creation is handled within orgService.createOrg (OrgRepoLive.ts)

    // 3. Return the created organization
    return organization;
  });
