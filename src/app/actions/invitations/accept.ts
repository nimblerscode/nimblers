"use server";

import { env } from "cloudflare:workers";
import { Data, Effect, Layer, Option, pipe, Schema } from "effect";
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

// Effect-TS Tagged Error types following codebase patterns
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly details?: Record<string, unknown>;
}> {}

export class AuthenticationError extends Data.TaggedError(
  "AuthenticationError"
)<{
  readonly message: string;
  readonly details?: Record<string, unknown>;
}> {}

export class InvitationProcessingError extends Data.TaggedError(
  "InvitationProcessingError"
)<{
  readonly message: string;
  readonly cause?: unknown;
  readonly context?: Record<string, unknown>;
}> {}

export async function acceptInvitationAction(
  request: Request,
  { ctx }: RequestInfo
) {
  const startTime = Date.now();

  const program = Effect.gen(function* () {
    // 1. Parse and validate request
    const contentType = request.headers.get("content-type");
    let token: string;

    if (contentType?.includes("application/json")) {
      const body = yield* Effect.tryPromise({
        try: () => request.json() as Promise<AcceptInvitationRequest>,
        catch: (error) =>
          new ValidationError({
            message: "Invalid JSON in request body",
            details: { error: String(error) },
          }),
      });
      token = body.token;
    } else {
      const formData = yield* Effect.tryPromise({
        try: () => request.formData(),
        catch: (error) =>
          new ValidationError({
            message: "Failed to parse form data",
            details: { error: String(error) },
          }),
      });
      token = formData.get("token") as string;
    }

    if (!token) {
      return yield* Effect.fail(
        new ValidationError({
          message: "Token is required",
        })
      );
    }

    // 2. Validate user authentication
    const currentUser = (ctx as any)?.user;
    if (!currentUser) {
      return yield* Effect.fail(
        new AuthenticationError({
          message: "User must be authenticated to accept invitations",
        })
      );
    }

    // 3. Convert and validate user ID
    const userId = yield* Effect.try({
      try: () => Schema.decodeUnknownSync(UserIdSchema)(currentUser.id),
      catch: (error) =>
        new ValidationError({
          message: "Invalid user ID format",
          details: { userId: currentUser.id, error: String(error) },
        }),
    });

    // 4. Create layers for dependency injection
    const invitationDOLayer = InvitationDOLive({ ORG_DO: env.ORG_DO });
    const tokenLayer = InviteTokenLive;
    const globalLayer = UserRepoLive.pipe(
      Layer.provide(DatabaseLive({ DB: env.DB }))
    );

    // 5. Verify token and extract organization info
    const tokenPayload = yield* pipe(
      InviteToken,
      Effect.flatMap((tokenService) => tokenService.verify(token)),
      Effect.provide(tokenLayer),
      Effect.mapError(
        (error) =>
          new ValidationError({
            message: "Invalid or expired invitation token",
            details: { originalError: String(error) },
          })
      )
    );

    const organizationSlug = tokenPayload.doId;

    // 6. Get and validate invitation
    const invitation = yield* pipe(
      InvitationDOService,
      Effect.flatMap((service) => service.get(token)),
      Effect.provide(invitationDOLayer),
      Effect.mapError(
        (error) =>
          new InvitationProcessingError({
            message: "Failed to retrieve invitation",
            cause: error,
            context: { organizationSlug },
          })
      )
    );

    if (!invitation) {
      return yield* Effect.fail(
        new ValidationError({
          message: "Invitation not found",
          details: { organizationSlug },
        })
      );
    }

    const invitationId = invitation.id;

    // 7. Verify email match
    if (currentUser.email !== invitation.email) {
      return yield* Effect.fail(
        new ValidationError({
          message: "This invitation is for a different email address",
          details: {
            invitedEmail: invitation.email,
            userEmail: currentUser.email,
            invitationId,
          },
        })
      );
    }

    // 8. Check if invitation is already accepted
    if (invitation.status === "accepted") {
      return yield* Effect.fail(
        new ValidationError({
          message: "This invitation has already been accepted",
          details: {
            invitationId,
            status: invitation.status,
          },
        })
      );
    }

    // 9. Atomic operation: Accept invitation and create global membership
    const acceptanceResult = yield* Effect.gen(function* () {
      // First, accept the invitation in the tenant database
      const tenantResult = yield* pipe(
        InvitationDOService,
        Effect.flatMap((service) => service.accept(token, userId)),
        Effect.provide(invitationDOLayer),
        Effect.mapError(
          (error) =>
            new InvitationProcessingError({
              message: "Failed to accept invitation in tenant database",
              cause: error,
              context: { organizationSlug, invitationId },
            })
        )
      );

      // Then, create the global membership
      const globalResult = yield* pipe(
        UserRepo,
        Effect.flatMap((userRepo) =>
          Effect.gen(function* () {
            // Look up organization by slug
            const orgOption = yield* userRepo.findOrganizationBySlug(
              organizationSlug
            );

            const organization = yield* Option.match(orgOption, {
              onNone: () =>
                Effect.fail(
                  new InvitationProcessingError({
                    message: "Organization not found in global database",
                    context: { organizationSlug },
                  })
                ),
              onSome: (org) => Effect.succeed(org),
            });

            // Create the membership
            const membershipData = yield* Effect.try({
              try: () =>
                Schema.decodeUnknownSync(NewMembershipSchema)({
                  userId,
                  organizationId: organization.id,
                  role: invitation.role,
                }),
              catch: (error) =>
                new ValidationError({
                  message: "Invalid membership data",
                  details: { error: String(error) },
                }),
            });

            return yield* userRepo.createMemberOrg(membershipData);
          })
        ),
        Effect.provide(globalLayer),
        Effect.mapError(
          (error) =>
            new InvitationProcessingError({
              message: "Failed to create global membership",
              cause: error,
              context: { organizationSlug, invitationId, userId },
            })
        )
      );

      return { tenantResult, globalResult };
    });

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      message: "Invitation accepted successfully",
      data: {
        organizationSlug,
        invitationId,
        userId,
        processingTime,
        tenantResult: acceptanceResult.tenantResult,
        globalResult: acceptanceResult.globalResult,
      },
    };
  });

  // Execute the program and handle errors
  const result = await Effect.runPromise(
    program.pipe(
      Effect.catchTags({
        ValidationError: (error) =>
          Effect.succeed({
            success: false,
            error: "VALIDATION_ERROR",
            message: error.message,
            details: error.details,
            processingTime: Date.now() - startTime,
          }),
        AuthenticationError: (error) =>
          Effect.succeed({
            success: false,
            error: "AUTHENTICATION_ERROR",
            message: error.message,
            details: error.details,
            processingTime: Date.now() - startTime,
          }),
        InvitationProcessingError: (error) =>
          Effect.succeed({
            success: false,
            error: "PROCESSING_ERROR",
            message: error.message,
            context: error.context,
            processingTime: Date.now() - startTime,
          }),
      }),
      Effect.catchAll((error) =>
        Effect.succeed({
          success: false,
          error: "UNEXPECTED_ERROR",
          message: "An unexpected error occurred",
          details: { error: String(error) },
          processingTime: Date.now() - startTime,
        })
      )
    )
  );

  return result;
}
