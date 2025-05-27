"use server";

import { env } from "cloudflare:workers";
import { Data, Effect, pipe } from "effect";
import { InvitationDOService } from "@/application/tenant/invitations/service";
import { InvitationDOLive } from "@/config/layers";
import type { Email } from "@/domain/global/email/model";
import type { User, UserId } from "@/domain/global/user/model";
import type { Invitation } from "@/domain/tenant/invitations/models";

// Define Effect-TS branded error types following project patterns
export class AuthenticationError extends Data.TaggedError(
  "AuthenticationError"
)<{
  readonly message: string;
  readonly code?: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly code: string;
  readonly field?: string;
}> {}

export class InvitationError extends Data.TaggedError("InvitationError")<{
  readonly message: string;
  readonly code?: string;
  readonly cause?: unknown;
}> {}

// Union type for all possible errors
type InviteUserError = AuthenticationError | ValidationError | InvitationError;

// Serializable error information
export interface SerializableError {
  type: string;
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, any>;
}

// Serializable invitation data (without DurableObjectId or other non-serializable fields)
export interface SerializableInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export type InviteUserState =
  | {
      success: false;
      message: string;
      errors: SerializableError | null;
      user: User;
    }
  | {
      success: true;
      message: string;
      errors: null;
      invitation: SerializableInvitation;
      token: string;
      user: User;
    };

// Validation functions using Effect
const validateUser = (
  user: User | undefined
): Effect.Effect<User, AuthenticationError> =>
  pipe(
    Effect.succeed(user),
    Effect.filterOrFail(
      (u): u is User =>
        u !== undefined && u.id !== undefined && u.id !== "unknown",
      () =>
        new AuthenticationError({
          message: "User authentication required",
          code: "USER_NOT_AUTHENTICATED",
        })
    )
  );

const validateFormData = (
  formData: FormData
): Effect.Effect<
  {
    email: Email;
    role: string;
    organizationSlug: string;
  },
  ValidationError
> =>
  Effect.gen(function* (_) {
    const email = formData.get("email") as string;
    const role = formData.get("role") as string;
    const organizationSlug = formData.get("organizationSlug") as string;

    // Validate required fields
    if (!email) {
      yield* _(
        Effect.fail(
          new ValidationError({
            message: "Email address is required",
            code: "MISSING_EMAIL",
            field: "email",
          })
        )
      );
    }

    if (!role) {
      yield* _(
        Effect.fail(
          new ValidationError({
            message: "Role is required",
            code: "MISSING_ROLE",
            field: "role",
          })
        )
      );
    }

    if (!organizationSlug) {
      yield* _(
        Effect.fail(
          new ValidationError({
            message: "Organization is required",
            code: "MISSING_ORGANIZATION",
            field: "organizationSlug",
          })
        )
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      yield* _(
        Effect.fail(
          new ValidationError({
            message: "Please enter a valid email address",
            code: "INVALID_EMAIL",
            field: "email",
          })
        )
      );
    }

    // Validate role
    const validRoles = ["admin", "editor", "viewer", "member"];
    if (!validRoles.includes(role)) {
      yield* _(
        Effect.fail(
          new ValidationError({
            message: "Invalid role selected",
            code: "INVALID_ROLE",
            field: "role",
          })
        )
      );
    }

    return {
      email: email as Email,
      role,
      organizationSlug,
    };
  });

const convertToSerializableError = (
  error: InviteUserError
): SerializableError => {
  switch (error._tag) {
    case "AuthenticationError":
      return {
        type: "AuthenticationError",
        message: error.message,
        code: error.code,
      };
    case "ValidationError":
      return {
        type: "ValidationError",
        message: error.message,
        code: error.code,
        field: error.field,
      };
    case "InvitationError":
      return {
        type: "InvitationError",
        message: error.message,
        code: error.code,
      };
  }
};

const safeToISOString = (dateValue: unknown): string => {
  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime())
      ? new Date().toISOString()
      : dateValue.toISOString();
  }

  const date = new Date(dateValue as number);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
};

const buildSuccessState = (
  user: User,
  email: Email,
  role: string,
  invitation: Invitation
): InviteUserState => ({
  success: true,
  message: `Invitation sent to ${email} successfully!`,
  errors: null,
  invitation: {
    id: invitation.id,
    email: email, // Use the validated email from form data
    role: role, // Use the validated role from form data
    status: invitation.status || "pending",
    createdAt: safeToISOString(invitation.createdAt),
    expiresAt: safeToISOString(invitation.expiresAt),
  },
  token: "generated-token", // Replace with actual token generation
  user,
});

export async function inviteUserAction(
  prevState: InviteUserState,
  formData: FormData
): Promise<InviteUserState> {
  const program = pipe(
    Effect.gen(function* (_) {
      // Validate user authentication
      const user = yield* _(validateUser(prevState.user));

      // Validate and extract form data
      const { email, role, organizationSlug } = yield* _(
        validateFormData(formData)
      );

      const invitationProgram = InvitationDOService.pipe(
        Effect.flatMap((service) =>
          service.create(
            {
              inviterId: prevState.user.id as UserId,
              inviteeEmail: email as Email,
              role: role,
            },
            organizationSlug
          )
        )
      );

      const fullLayer = InvitationDOLive({
        ORG_DO: env.ORG_DO,
      });

      const invitation = yield* _(
        Effect.tryPromise({
          try: () =>
            Effect.runPromise(
              invitationProgram.pipe(Effect.provide(fullLayer))
            ),
          catch: (error) => {
            return new InvitationError({
              message: "Failed to create invitation",
              code: "INVITATION_CREATION_FAILED",
              cause: error,
            });
          },
        })
      );

      return buildSuccessState(user, email, role, invitation);
    }),
    Effect.catchAll((error) => {
      const serializableError = convertToSerializableError(error);
      return Effect.succeed({
        success: false,
        message: error.message || "Failed to send invitation",
        errors: serializableError,
        user: prevState.user,
      } as InviteUserState);
    })
  );

  return Effect.runPromise(program);
}
