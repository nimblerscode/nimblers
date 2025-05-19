"use server";

import { requestInfo } from "@redwoodjs/sdk/worker";
import { env } from "cloudflare:workers";
import { Effect, Exit, Layer } from "effect";

import { DatabaseLive, OrganizationDOLive } from "@/config/layers";

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

// Type for the successfully created organization data returned by the DO/Action
// This should match the structure returned by the DO on successful init
type OrganizationClientResponse = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

// TODO: Define and uncomment if needed for switchActiveOrganization
/*
export type SwitchOrganizationActionState = {
  success: boolean;
  message: string;
  error?: string | null; // Simple error message for client
};
*/

// === CREATE ORGANIZATION ACTION ===
export async function createOrganizationAction(
  _prevState: CreateOrganizationActionState, // previous state from useActionState
  formData: FormData
): Promise<CreateOrganizationActionState> {
  const ctx = requestInfo.ctx as AppContext;

  // --- Retrieve authenticated userId ---
  if (!ctx.session || !ctx.session.userId) {
    console.error(
      "createOrganizationAction: No session or userId found. User might not be authenticated."
    );
    return {
      success: false,
      message: "Authentication required. Please log in and try again.",
      errors: { auth: ["User not authenticated."] },
      organization: null,
    };
  }
  const creatorId = ctx.session.userId;

  // --- Basic Validation (can be enhanced or moved) ---
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const logo = formData.get("logo") as string | undefined;

  const orgCreatePayload: NewOrganization = {
    name,
    slug,
    logo: logo ?? undefined,
    // id and createdAt will be handled by the DO/service layer
  };

  // Create the Effect program using the service
  const createOrgProgram = OrganizationDOService.pipe(
    Effect.flatMap((service) =>
      service.createOrganization(orgCreatePayload, creatorId as UserId)
    )
  );

  const finalLayer = OrganizationDOLive({ ORG_DO: env.ORG_DO });

  const runnableEffect = createOrgProgram.pipe(Effect.provide(finalLayer));

  // Run the Effect
  const program = await Effect.runPromiseExit(runnableEffect);

  if (Exit.isSuccess(program)) {
    // insert the organization into the D1 database
    const organization = program.value;

    // Create the effect to insert into main DB
    const orgRepoLayer = OrgRepoD1LayerLive.pipe(
      Layer.provide(DatabaseLive({ DB: env.DB }))
    );

    console.log("organization", organization);

    const create = OrgD1Service.pipe(
      Effect.flatMap((service) =>
        service.create({
          id: organization.id,
          name: organization.name,
          creatorId: creatorId as UserId,
        })
      )
    ).pipe(Effect.provide(orgRepoLayer));

    const result = await Effect.runPromiseExit(create);

    if (Exit.isSuccess(result)) {
      return {
        success: true,
        message: "Organization created successfully!",
        organization: {
          name: organization.name,
          slug: organization.slug,
          logo: organization.logo ?? undefined,
        },
        errors: null,
      };
    }

    if (Exit.isFailure(result)) {
      console.error("Failed to insert org to main DB:", result.cause);
      return {
        success: false,
        message: "Failed to insert organization into main DB.",
        errors: null,
      };
    }
  }

  if (Exit.isFailure(program)) {
    console.error("Failed to create organization:", program.cause);
    return {
      success: false,
      message: `Failed to create organization: ${program.cause}`,
      errors: null,
    };
  }

  return {
    success: false,
    message: "Failed to create organization. Unknown error.",
    errors: null,
  };
}

// --- PLACEHOLDER FOR OTHER ACTIONS ---
// TODO: Refactor getOrganizationsForUser and switchActiveOrganization similarly

export async function getOrganizationsForUser(): Promise<
  OrganizationClientResponse[]
> {
  // ... Implementation needed (likely query DB via ctx.env.DB)
  return [];
}

/*
export async function switchActiveOrganization(organizationId: string): Promise<SwitchOrganizationActionState> {
  "use server";
  // ... Implementation needed (likely update session via ctx.session)
  return { success: false, message: "Not implemented", error: "Not Implemented" };
}
*/
