import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Context } from "effect";
import { Effect, Exit, Option } from "effect";
import { sendEmail as sendEmailEffect } from "@/application/global/email/sendEmail";
import type { EmailService as EmailServiceTag } from "@/domain/global/email/service";
import { EmailService } from "@/domain/global/email/service";
import * as schema from "@/infrastructure/persistence/global/d1/schema";

// Type for the actual service implementation object
type EmailServiceInterface = Context.Tag.Service<typeof EmailServiceTag>;

const makeAuth = (
  db: DrizzleD1Database<typeof schema>,
  emailServiceImpl: EmailServiceInterface
) =>
  betterAuth({
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const x = Effect.gen(function* () {
              const result = yield* Effect.tryPromise({
                try: () => {
                  return db
                    .select()
                    .from(schema.session)
                    .where(eq(schema.session.token, session.token));
                },
                catch: () => new Error("Failed to get organization"),
              });

              return result;
            });

            const result = await Effect.runPromiseExit(x);

            if (Exit.isFailure(result)) {
              return {
                data: {
                  ...session,
                  activeOrganizationId: null,
                },
              };
            }

            if (Exit.isSuccess(result)) {
              return {
                data: {
                  ...session,
                  activeOrganizationId: result.value?.[0]?.activeOrganizationId,
                },
              };
            }
          },
        },
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url, token }) => {
        const verificationEmailEffect = sendEmailEffect({
          from: "welcome@email.nimblers.co",
          to: user.email,
          subject: "Verify your email",
          body: `<p>Verify your email by clicking <a href='${url}'>here</a></p>`,
        });

        const runnableEffect = verificationEmailEffect.pipe(
          Effect.provideService(EmailService, emailServiceImpl)
        );

        const result = await Effect.runPromiseExit(runnableEffect);

        if (Exit.isFailure(result)) {
          const errorToThrow = Exit.causeOption(result).pipe(
            Option.getOrElse(() => new Error("Unknown error sending email"))
          );
          throw errorToThrow;
        }
      },
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 3600, // 1 hour
    },
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
  });

export const auth = makeAuth;
