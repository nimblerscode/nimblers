"use server";

import { env } from "cloudflare:workers";
import { Effect, Layer, Option, Schema } from "effect";
import type { RequestInfo } from "rwsdk/worker";
import { InvitationDOService } from "@/application/tenant/invitations/service";
import { DatabaseLive, InvitationDOLive } from "@/config/layers";
import { NewMembershipSchema, UserIdSchema } from "@/domain/global/user/model";
import { UserRepo } from "@/domain/global/user/service";
import {
  InviteToken,
  InviteTokenLive,
} from "@/domain/tenant/invitations/tokenUtils";
import { UserRepoLive } from "@/infrastructure/persistence/global/d1/UserRepoAdapter";

interface AcceptInvitationRequest {
  token: string;
}

export async function acceptInvitationAction(
  request: Request,
  { ctx }: RequestInfo,
) {
  let token: string;

  // Handle both FormData and JSON request bodies
  const contentType = request.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    // Handle JSON body (from fetch requests)
    const body = (await request.json()) as AcceptInvitationRequest;
    token = body.token;
  } else {
    // Handle FormData (from form submissions)
    const formData = await request.formData();
    token = formData.get("token") as string;
  }

  if (!token) {
    throw new Error("Token is required");
  }

  // Get the current user from the context (they should be logged in after signup)
  const currentUser = (ctx as any)?.user;

  if (!currentUser) {
    throw new Error("User must be authenticated to accept invitations");
  }

  // Convert user ID to branded UserId type
  const userId = Schema.decodeUnknownSync(UserIdSchema)(currentUser.id);

  // First, get the invitation to validate it and check email match
  const getInvitationProgram = InvitationDOService.pipe(
    Effect.flatMap((service) => service.get(token)),
  );

  const invitationDOLayer = InvitationDOLive({
    ORG_DO: env.ORG_DO,
  });

  const invitation = await Effect.runPromise(
    getInvitationProgram.pipe(Effect.provide(invitationDOLayer)),
  );

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  // Verify that the current user's email matches the invitation email
  if (currentUser.email !== invitation.email) {
    throw new Error("This invitation is for a different email address");
  }

  // Extract organization slug from token
  const tokenVerificationProgram = InviteToken.pipe(
    Effect.flatMap((tokenService) => tokenService.verify(token)),
  );

  const tokenLayer = InviteTokenLive;

  const tokenPayload = await Effect.runPromise(
    tokenVerificationProgram.pipe(Effect.provide(tokenLayer)),
  );

  const organizationSlug = tokenPayload.doId;

  // Accept the invitation in the tenant Durable Object
  // This creates the membership in the tenant database and updates invitation status
  const acceptanceProgram = InvitationDOService.pipe(
    Effect.flatMap((service) => service.accept(token, userId)),
  );

  await Effect.runPromise(
    acceptanceProgram.pipe(Effect.provide(invitationDOLayer)),
  );

  // Create global organization-member relationship in D1 database
  // This is needed for cross-tenant operations like showing user's organizations in profile
  const createGlobalMembershipProgram = UserRepo.pipe(
    Effect.flatMap((userRepo) =>
      Effect.gen(function* () {
        // Look up organization by slug to get the correct organization ID
        const orgOption =
          yield* userRepo.findOrganizationBySlug(organizationSlug);

        // Extract the organization or fail if not found
        const organization = yield* Option.match(orgOption, {
          onNone: () =>
            Effect.fail(
              new Error(
                `Organization not found in global database: ${organizationSlug}`,
              ),
            ),
          onSome: (org) => Effect.succeed(org),
        });

        // Now create the membership with the correct organization ID
        const membershipData = Schema.decodeUnknownSync(NewMembershipSchema)({
          userId,
          organizationId: organization.id,
          role: invitation.role,
        });

        return yield* userRepo.createMemberOrg(membershipData);
      }),
    ),
  );

  const globalLayer = UserRepoLive.pipe(
    Layer.provide(DatabaseLive({ DB: env.DB })),
  );

  await Effect.runPromise(
    createGlobalMembershipProgram.pipe(Effect.provide(globalLayer)),
  );

  return {
    success: true,
    message:
      "Invitation accepted successfully! You are now a member of the organization.",
    data: {
      invitationId: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: "accepted",
      organizationId: organizationSlug,
    },
  };
}
