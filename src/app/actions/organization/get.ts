"use server";
import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { requestInfo } from "rwsdk/worker";
import { DatabaseLive, OrganizationDOLive } from "@/config/layers";
import { Tracing } from "@/tracing";
import type { OrganizationWithMembershipAndName } from "@/domain/global/organization/model";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import { OrgD1Service } from "@/domain/global/organization/service";
import type { UserId } from "@/domain/global/user/model";
import { OrganizationDOService } from "@/domain/tenant/organization/service";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { OrgRepoD1LayerLive } from "@/infrastructure/persistence/global/d1/OrgD1RepoLive";

// Re-export for backward compatibility
export type { OrganizationWithMembershipAndName } from "@/domain/global/organization/model";

function checkIfOrgExists(organizationSlug: OrganizationSlug) {
  const ctx = requestInfo.ctx as AppContext;

  if (!ctx.session || !ctx.session.userId) {
    throw new Error("User not authenticated");
  }

  const userId = ctx.session.userId as UserId;

  const getOrgIdBySlugProgram = OrgD1Service.pipe(
    Effect.flatMap((service) =>
      service.verifyUserOrgMembership(organizationSlug, userId)
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

export async function getOrganization(organizationSlug: OrganizationSlug) {
  const program = Effect.gen(function* () {
    const slug = yield* Effect.tryPromise({
      try: () => checkIfOrgExists(organizationSlug),
      catch: (e) => {
        return e;
      },
    });

    const organization = yield* OrganizationDOService.pipe(
      Effect.flatMap((service) => {
        return service.getOrganization(slug);
      }),
      Effect.withSpan("get-organization-from-do", {
        attributes: {
          "organization.slug": organizationSlug,
          "action.type": "get-organization",
        },
      })
    );

    return organization;
  }).pipe(
    Effect.withSpan("get-organization-action", {
      attributes: {
        "action.type": "get-organization",
        "organization.slug": organizationSlug,
      },
    }),
    Effect.provide(OrganizationDOLive({ ORG_DO: env.ORG_DO }))
  );

  return Effect.runPromise(program.pipe(Effect.provide(Tracing)));
}

export async function getUserOrganizations(): Promise<
  OrganizationWithMembershipAndName[]
> {
  const ctx = requestInfo.ctx as AppContext;

  if (!ctx.session || !ctx.session.userId) {
    return [];
  }

  const userId = ctx.session.userId as UserId;

  // First, get organizations with membership info from D1
  const getOrganizationsProgram = OrgD1Service.pipe(
    Effect.flatMap((service) => service.getOrganizationsForUser(userId))
  );

  const d1Layer = OrgRepoD1LayerLive.pipe(
    Layer.provide(DatabaseLive({ DB: env.DB }))
  );

  try {
    const organizations = await Effect.runPromise(
      getOrganizationsProgram.pipe(Effect.provide(d1Layer))
    );

    // Now fetch organization details (including name) from Durable Objects
    const doLayer = OrganizationDOLive({ ORG_DO: env.ORG_DO });

    const organizationsWithNames = await Promise.all(
      organizations.map(async (org) => {
        try {
          const getOrgDetailsProgram = OrganizationDOService.pipe(
            Effect.flatMap((service) => service.getOrganization(org.slug))
          );

          const orgDetails = await Effect.runPromise(
            getOrgDetailsProgram.pipe(Effect.provide(doLayer))
          );

          return {
            id: org.id,
            slug: org.slug,
            name: orgDetails.name,
            status: org.status,
            role: org.role,
            createdAt: org.createdAt,
          };
        } catch (_error) {
          // Fallback to slug as name if we can't get the details
          return {
            id: org.id,
            slug: org.slug,
            name: org.slug,
            status: org.status,
            role: org.role,
            createdAt: org.createdAt,
          };
        }
      })
    );

    return organizationsWithNames;
  } catch (_error) {
    return [];
  }
}
