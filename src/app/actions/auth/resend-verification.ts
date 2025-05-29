"use server";

import { env } from "cloudflare:workers";
import { Effect, pipe } from "effect";
import { requestInfo } from "rwsdk/worker";
import { EmailVerificationLayerLive } from "@/config/layers";
import {
  EmailAlreadyVerifiedError,
  EmailVerificationUseCase,
  UserNotAuthenticatedError,
} from "@/domain/global/auth/service";
import type { Email } from "@/domain/global/email/model";
import type { AppContext } from "@/infrastructure/cloudflare/worker";

export interface ResendVerificationState {
  success: boolean;
  message: string | null;
  error: string | null;
}

export async function resendVerificationEmail(): Promise<ResendVerificationState> {
  const program = pipe(
    Effect.gen(function* () {
      // Get user context
      const { ctx } = requestInfo;
      const appCtx = ctx as AppContext;

      // Check if user is authenticated
      if (!appCtx.user) {
        return yield* Effect.fail(new UserNotAuthenticatedError());
      }

      // Check if email is already verified
      if (appCtx.user.emailVerified) {
        return yield* Effect.fail(
          new EmailAlreadyVerifiedError({
            email: appCtx.user.email,
          }),
        );
      }

      // Use the email verification service
      const emailVerificationService = yield* EmailVerificationUseCase;

      yield* emailVerificationService.resendVerificationEmail(
        appCtx.user.email as Email,
      );

      return {
        success: true,
        message:
          "Verification email sent successfully! Please check your inbox.",
        error: null,
      };
    }),
    Effect.catchTags({
      UserNotAuthenticatedError: () =>
        Effect.succeed({
          success: false,
          message: null,
          error: "You must be logged in to resend verification email",
        }),
      EmailAlreadyVerifiedError: () =>
        Effect.succeed({
          success: false,
          message: null,
          error: "Your email is already verified",
        }),
      EmailVerificationError: (error) =>
        Effect.succeed({
          success: false,
          message: null,
          error:
            error.message ||
            "Failed to send verification email. Please try again later.",
        }),
    }),
    Effect.catchAll((_error) => {
      return Effect.succeed({
        success: false,
        message: null,
        error: "Failed to send verification email. Please try again later.",
      });
    }),
  );

  // Provide the email verification layer with database access
  const fullLayer = EmailVerificationLayerLive({ DB: env.DB });

  return Effect.runPromise(program.pipe(Effect.provide(fullLayer)));
}
