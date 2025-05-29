import { Effect, Layer } from "effect";
import {
  EmailAlreadyVerifiedError,
  EmailVerificationError,
  EmailVerificationUseCase,
} from "@/domain/global/auth/service";
import type { Email } from "@/domain/global/email/model";
import { UserRepo } from "@/domain/global/user/service";
import { EnvironmentConfigService } from "@/domain/global/environment/service";

export const EmailVerificationUseCaseLive = Layer.effect(
  EmailVerificationUseCase,
  Effect.gen(function* () {
    const userRepo = yield* UserRepo;
    const envConfig = yield* EnvironmentConfigService;

    return {
      resendVerificationEmail: (userEmail: Email) => {
        return Effect.gen(function* () {
          // 1. Find the user by email
          const user = yield* userRepo.findByEmail(userEmail).pipe(
            Effect.mapError(
              (error) =>
                new EmailVerificationError({
                  message: "Failed to find user",
                  cause: error,
                })
            )
          );

          // 2. Check if email is already verified
          if (user.emailVerified) {
            return yield* Effect.fail(
              new EmailAlreadyVerifiedError({
                email: userEmail,
              })
            );
          }

          // 3. Use Better Auth's built-in verification system
          // Better Auth will handle token generation and email sending
          yield* Effect.tryPromise({
            try: async () => {
              // Make a request to Better Auth's send verification endpoint
              const response = await fetch(
                `${envConfig.getBaseUrl()}/api/auth/send-verification-email`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    email: userEmail,
                    callbackURL: "/profile",
                  }),
                }
              );

              if (!response.ok) {
                throw new Error(
                  `Better Auth verification failed: ${response.status}`
                );
              }
            },
            catch: (error) =>
              new EmailVerificationError({
                message: "Failed to send verification email via Better Auth",
                cause: error,
              }),
          });

          return;
        }).pipe(
          Effect.withSpan("EmailVerificationUseCase.resendVerificationEmail")
        );
      },
    };
  })
);
