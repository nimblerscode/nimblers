import { EmailServiceError } from "@/core/email/model";
import { Effect } from "effect";
import { EmailService } from "./services";

export const sendEmail = ({
  from,
  to,
  subject,
  body,
}: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): Effect.Effect<void, EmailServiceError, EmailService> =>
  Effect.gen(function* (_) {
    const emailService = yield* _(EmailService);
    yield* emailService
      .sendEmail({
        from,
        to,
        subject,
        body,
      })
      .pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new EmailServiceError({
              message: error.message,
              cause: error.cause,
            }),
          ),
        ),
      );
  });
