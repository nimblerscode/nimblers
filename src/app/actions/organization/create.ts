"use server";

import { env } from "cloudflare:workers";
import { Effect, Exit, Layer } from "effect";
import { requestInfo } from "rwsdk/worker";

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

// === CREATE ORGANIZATION ACTION ===
export async function createOrganizationAction(
  _prevState: CreateOrganizationActionState, // previous state from useActionState
  formData: FormData
): Promise<CreateOrganizationActionState> {
  const ctx = requestInfo.ctx as AppContext;

  // --- Retrieve authenticated userId ---
  if (!ctx.session || !ctx.session.userId) {
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
  const logo = formData.get("logo") as string | undefined;

  // Validate organization name
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return {
      success: false,
      message: "Organization name is required and cannot be empty.",
      errors: { name: ["Organization name is required and cannot be empty."] },
      organization: null,
    };
  }

  // the slug is the name in lowercase with dashes
  const slug = name.trim().toLowerCase().replace(/ /g, "-");

  // Validate slug
  if (!slug || slug.length === 0) {
    return {
      success: false,
      message: "Invalid organization name. Please provide a valid name.",
      errors: {
        name: ["Invalid organization name. Please provide a valid name."],
      },
      organization: null,
    };
  }

  const orgCreatePayload: NewOrganization = {
    name: name.trim(),
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

    const create = OrgD1Service.pipe(
      Effect.flatMap((service) =>
        service.create({
          id: organization.id, // Use slug as ID for consistency
          slug: organization.slug,
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
      return {
        success: false,
        message: "Failed to insert organization into main DB.",
        errors: null,
      };
    }
  }

  if (Exit.isFailure(program)) {
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
