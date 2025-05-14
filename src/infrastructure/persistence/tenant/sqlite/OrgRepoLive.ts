import { MemberRepo } from "@/domain/tenant/member/service";
import type { OrgDbError } from "@/domain/tenant/organization/model";
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

    const adapter = makeOrgEffectAdapter(
      makeOrgDrizzleAdapter(client.db),
      memberRepoService,
    );

    // Wrap/rename and adapt error type if needed
    return {
      create: (data, creatorUserId) =>
        adapter.createOrg(data, creatorUserId).pipe(
          // If createOrg only throws OrgDbError, widen to OrgDbError | DOInteractionError
          Effect.mapError((e) => e as OrgDbError),
        ),
      // ...add other methods as needed
    };
  }),
);
