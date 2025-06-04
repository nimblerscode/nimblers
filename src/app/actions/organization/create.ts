"use server";

import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { requestInfo } from "rwsdk/worker";

import { DatabaseLive, OrganizationDOLive } from "@/config/layers";
import { Tracing } from "@/tracing";

import { OrgD1Service } from "@/domain/global/organization/service";
import type { UserId } from "@/domain/global/user/model";
import type { NewOrganization } from "@/domain/tenant/organization/model";
import { OrganizationDOService } from "@/domain/tenant/organization/service";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { OrgRepoD1LayerLive } from "@/infrastructure/persistence/global/d1/OrgD1RepoLive";

// Define your global Env type, or import it if defined elsewhere
// This should match the bindings defined in your wrangler.jsonc

// Define the return type of the server action
export interface CreateOrganizationActionState {
  success: boolean;
  message: string;
  errors?: { [key: string]: string[] } | null;
  organization?: NewOrganization | null; // Or a more specific DTO for the created org
}

// Define the server action for creating an organization
export async function createOrganizationAction(
  _prevState: CreateOrganizationActionState, // previous state from useActionState
  formData: FormData
): Promise<CreateOrganizationActionState> {
  const program = Effect.gen(function* () {
    // Get the user context from rwsdk
    const ctx = requestInfo.ctx as AppContext;

    if (!ctx.session || !ctx.session.userId) {
      return {
        success: false,
        message: "User not authenticated.",
        errors: null,
      };
    }

    const creatorId = ctx.session.userId;

    // Extract and validate organization data from the form
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const logo = formData.get("logo") as string | null;

    if (!name || !slug) {
      return {
        success: false,
        message: "Organization name and slug are required.",
        errors: {
          name: !name ? ["Organization name is required"] : [],
          slug: !slug ? ["Organization slug is required"] : [],
        },
      };
    }

    // Transform to expected format
    const newOrganization: NewOrganization = {
      name,
      slug,
      logo: logo || undefined,
    };

    // Create organization via DO
    const organization = yield* OrganizationDOService.pipe(
      Effect.flatMap((service) =>
        service.createOrganization(newOrganization, creatorId as UserId)
      ),
      Effect.withSpan("create-organization-in-do", {
        attributes: {
          "organization.name": name,
          "organization.slug": slug,
          "user.id": creatorId,
          "action.type": "create-organization",
        },
      })
    );

    // Create the effect to insert into main DB
    const orgD1Result = yield* OrgD1Service.pipe(
      Effect.flatMap((service) =>
        service.create({
          id: organization.id, // Use slug as ID for consistency
          slug: organization.slug,
          creatorId: creatorId as UserId,
        })
      ),
      Effect.withSpan("create-organization-in-d1", {
        attributes: {
          "organization.id": organization.id,
          "organization.slug": organization.slug,
          "user.id": creatorId,
        },
      })
    );

    return {
      success: true,
      message: "Organization created successfully!",
      organization: {
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo ? organization.logo : undefined,
      },
      errors: null,
    };
  }).pipe(
    Effect.withSpan("create-organization-action", {
      attributes: {
        "action.type": "create-organization",
      },
    }),
    Effect.provide(
      Layer.mergeAll(
        OrganizationDOLive({ ORG_DO: env.ORG_DO }),
        OrgRepoD1LayerLive.pipe(Layer.provide(DatabaseLive({ DB: env.DB })))
      )
    ),
    Effect.catchAll((error) =>
      Effect.succeed({
        success: false,
        message: `Failed to create organization: ${error}`,
        errors: null,
      })
    )
  );

  return Effect.runPromise(program.pipe(Effect.provide(Tracing)));
}
