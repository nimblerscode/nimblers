import { EmailServiceError } from "@/core/email/model";
import { EmailService } from "@/core/email/services";
import { Effect, Layer } from "effect";
import { EmailConfig } from "./resendConfig";

export const ResendEmailAdapterLive = Layer.effect(
  EmailService,
  Effect.gen(function* (_) {
    const emailInstance = yield* _(EmailConfig);
    const serviceMethods = {
      sendEmail: ({
        from,
        to,
        subject,
        body,
      }: {
        from: string;
        to: string;
        subject: string;
        body: string;
      }) =>
        Effect.tryPromise({
          try: () =>
            emailInstance.emails.send({
              from,
              to,
              subject,
              html: body,
            }),
          catch: (error) =>
            new EmailServiceError({
              message: `Adapter: Failed to send email. Original error: ${error}`,
            }),
        }),
    };

    return serviceMethods;
  }),
);
