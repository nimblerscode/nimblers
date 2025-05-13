import type { EmailService as EmailServiceTag } from "@/domain/global/email/service";
import * as schema from "@/infrastructure/persistence/global/d1/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Context } from "effect";
import { Effect } from "effect";

// Type for the actual service implementation object
type EmailServiceInterface = Context.Tag.Service<typeof EmailServiceTag>;

const makeAuth = (
  db: DrizzleD1Database<typeof schema>,
  emailServiceImpl: EmailServiceInterface,
) =>
  betterAuth({
    emailVerification: {
      sendVerificationEmail: async ({ user, url, token }) => {
        await Effect.runPromise(
          emailServiceImpl.sendEmail({
            from: "welcome@email.nimblers.co",
            to: user.email,
            subject: "Verify your email",
            body: `<p>Verify your email by clicking <a href='${url}'>here</a></p>`,
          }),
        );
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
