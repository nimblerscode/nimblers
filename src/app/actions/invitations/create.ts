"use server";

import { env } from "cloudflare:workers";
import { Effect, pipe } from "effect";
import { InvitationDOService } from "@/application/tenant/invitations/service";
import { InvitationDOLive } from "@/config/layers";
import type { Email } from "@/domain/global/email/model";
import type { UserId, User } from "@/domain/global/user/model";
import type { Invitation } from "@/domain/tenant/invitations/models";

// Define explicit error types following Effect-TS patterns
export class AuthenticationError extends Error {
  readonly _tag = "AuthenticationError";
  constructor(message: string, public code = "USER_NOT_FOUND") {
    super(message);
  }
}

export class ValidationError extends Error {
  readonly _tag = "ValidationError";
  constructor(message: string, public code: string) {
    super(message);
  }
}

export class InvitationError extends Error {
  readonly _tag = "InvitationError";
  constructor(message: string, public code = "INVITATION_FAILED") {
    super(message);
  }
}

// Union type for all possible errors
type InviteUserError = AuthenticationError | ValidationError | InvitationError;

// Serializable error information
export interface SerializableError {
  type: string;
  message: string;
  code?: string;
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
      () => new AuthenticationError("User authentication required")
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
    if (!email || !role || !organizationSlug) {
      yield* _(
        Effect.fail(
          new ValidationError("All fields are required", "MISSING_FIELDS")
        )
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      yield* _(
        Effect.fail(
          new ValidationError(
            "Please enter a valid email address",
            "INVALID_EMAIL"
          )
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
  invitation: Invitation
): InviteUserState => ({
  success: true,
  message: `Invitation sent to ${email} successfully!`,
  errors: null,
  invitation: {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
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
            console.error("Error creating invitation:", error);
            return new InvitationError("Failed to create invitation");
          },
        })
      );

      return buildSuccessState(user, email, invitation);
    }),
    Effect.catchAll((error) => {
      console.error("Error in invitation action:", error);
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
