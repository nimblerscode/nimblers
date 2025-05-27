import { Effect, Layer } from "effect";
import { EmailError } from "@/domain/global/email/model";
import { EmailService } from "@/domain/global/email/service";
import { EmailConfig } from "./config";

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
          try: async () => {
            const result = await emailInstance.emails.send({
              from,
              to,
              subject,
              html: body,
            });

            return result;
          },
          catch: (error) => {
            return new EmailError({
              message: `Adapter: Failed to send email. Original error: ${error}`,
            });
          },
        }),
    };

    return serviceMethods;
  }),
);
