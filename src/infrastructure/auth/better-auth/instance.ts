import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Context } from "effect";
import { Effect, Exit } from "effect";
import type { EmailService as EmailServiceTag } from "@/domain/global/email/service";
import { EmailService } from "@/domain/global/email/service";
import { sendEmail as sendEmailEffect } from "@/application/global/email/sendEmail";
import * as schema from "@/infrastructure/persistence/global/d1/schema";
import { Option } from "effect";

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
            console.log("session", session);
            console.log("result better auth");

            const x = Effect.gen(function* () {
              const result = yield* Effect.tryPromise({
                try: () => {
                  console.log("session.id ---->", session);
                  console.log("schema.session.id ---->", schema.session.token);
                  return db
                    .select()
                    .from(schema.session)
                    .where(eq(schema.session.token, session.token));
                },
                catch: () => new Error("Failed to get organization"),
              });

              return result;
            });

            console.log("x", x);

            const result = await Effect.runPromiseExit(x);

            console.log("result", result);

            if (Exit.isFailure(result)) {
              console.error(result.cause);
              return {
                data: {
                  ...session,
                  activeOrganizationId: null,
                },
              };
            }

            if (Exit.isSuccess(result)) {
              console.log("result better auth", result.value);
              console.log(result.value);
              return {
                data: {
                  ...session,
                  activeOrganizationId: result.value?.[0]?.activeOrganizationId,
                },
              };
            }
          },
        },
        // update: {
        //   before: async (session) => {
        //     console.log("session input to hook:", session);

        //     if (!session.userId) {
        //       console.warn(
        //         "session.userId is undefined in update.before hook. Cannot determine activeOrganizationId. Proceeding with original update."
        //       );
        //       return;
        //     }
        //     const currentUserId = session.userId;

        //     console.log("result better auth (userId confirmed):");

        //     const x = Effect.gen(function* () {
        //       const result = yield* Effect.tryPromise({
        //         try: () => {
        //           console.log(
        //             "Querying session for userId ---->",
        //             currentUserId
        //           );
        //           return db
        //             .select()
        //             .from(schema.session)
        //             .where(eq(schema.session.userId, currentUserId));
        //         },
        //         catch: () =>
        //           new Error("Failed to get organization session data"),
        //       });
        //       return result;
        //     });

        //     const resultExit = await Effect.runPromiseExit(x);
        //     console.log("DB query resultExit:", resultExit);

        //     let activeOrgIdToSet: string | null = null;

        //     if (Exit.isSuccess(resultExit)) {
        //       console.log("DB query success. Result value:", resultExit.value);
        //       if (resultExit.value && resultExit.value.length > 0) {
        //         activeOrgIdToSet =
        //           resultExit.value[0].activeOrganizationId ?? null;
        //       }
        //     } else {
        //       console.error("DB query failed:", resultExit.cause);
        //     }

        //     console.log("activeOrgIdToSet:", activeOrgIdToSet);

        //     return {
        //       data: {
        //         ...session,
        //         id: session.id!,
        //         userId: currentUserId,
        //         token: session.token!,
        //         expiresAt: session.expiresAt!,
        //         createdAt: session.createdAt!,
        //         updatedAt: session.updatedAt!,
        //         activeOrganizationId: activeOrgIdToSet,
        //       },
        //     };
        //   },
        // },
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
          console.error(
            `Failed to send verification email to ${user.email}:`,
            result.cause
          );
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
