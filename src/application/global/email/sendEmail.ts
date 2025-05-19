import { Effect } from "effect";
import { EmailError } from "@/domain/global/email/model";
import { EmailService } from "@/domain/global/email/service";

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
}): Effect.Effect<void, EmailError, EmailService> =>
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
            new EmailError({
              message: error.message,
              cause: error.cause,
            }),
          ),
        ),
      );
  });
