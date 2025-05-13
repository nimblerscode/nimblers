import { MemberRepo } from "@/domain/tenant/member/service";
import { OrgService } from "@/domain/tenant/organization/service";
import { makeOrgDrizzleAdapter } from "@/infrastructure/persistence/tenant/sqlite/OrgDrizzleAdapter";
import { makeOrgEffectAdapter } from "@/infrastructure/persistence/tenant/sqlite/OrgEffectAdapter";
import { DrizzleDOClient } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { Effect, Layer } from "effect";

// --- Live Layer ---
export const OrgRepoLive = Layer.effect(
  OrgService,
  Effect.gen(function* () {
    const client = yield* DrizzleDOClient;
    const memberRepoService = yield* MemberRepo;

    return makeOrgEffectAdapter(
      makeOrgDrizzleAdapter(client.db),
      memberRepoService,
    );
  }),
);
