"use server";
import { DatabaseLive, OrganizationDOLive } from "@/config/layers";
import { OrgD1Service } from "@/domain/global/organization/service";

import { OrganizationDOService } from "@/domain/tenant/organization/service";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { OrgRepoD1LayerLive } from "@/infrastructure/persistence/global/d1/OrgD1RepoLive";
import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { requestInfo } from "rwsdk/worker";

function checkIfOrgExists(organizationSlug: string) {
  const ctx = requestInfo.ctx as AppContext;

  if (!ctx.session || !ctx.session.userId) {
    throw new Error("User not authenticated");
  }

  const userId = ctx.session.userId;

  const getOrgIdBySlugProgram = OrgD1Service.pipe(
    Effect.flatMap((service) =>
      service.getOrgIdBySlug(organizationSlug, userId)
    )
  );

  const finalLayer = OrgRepoD1LayerLive.pipe(
    Layer.provide(DatabaseLive({ DB: env.DB }))
  );

  const slug = Effect.runPromise(
    getOrgIdBySlugProgram.pipe(Effect.provide(finalLayer))
  );

  return slug;
}

export async function getOrganization(organizationSlug: string) {
  const slug = Effect.tryPromise({
    try: () => checkIfOrgExists(organizationSlug),
    catch: (e) => {
      console.log("error", e);
      return e;
    },
  });

  const slugResult = await Effect.runPromise(slug);

  const getOrganizationProgram = OrganizationDOService.pipe(
    Effect.flatMap((service) => {
      console.log("service", service);
      return service.getOrganization(slugResult);
    })
  );

  const finalLayer = OrganizationDOLive({ ORG_DO: env.ORG_DO });

  const runnableEffect = getOrganizationProgram.pipe(
    Effect.provide(finalLayer)
  );
  const program = await Effect.runPromise(runnableEffect);

  return program;
}
