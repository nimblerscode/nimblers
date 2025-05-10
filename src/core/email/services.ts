import { Context, Effect, Layer, Ref } from "effect";

export class EmailService extends Context.Tag("core/email/EmailService")<
  EmailService,
  {
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
    }) => Effect.Effect<void, Error>;
  }
>() {}

// --- Helper Tag for sent emails ---
export interface SentEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
}
export class SentEmails extends Context.Tag("core/email/SentEmails")<
  SentEmails,
  Ref.Ref<Array<SentEmail>>
>() {}

// --- Test Layer Implementation ---
export const EmailServiceTest = Layer.scoped(
  EmailService,
  Effect.gen(function* (_) {
    const sentEmailsRef = yield* _(Ref.make<Array<SentEmail>>([]));
    // Provide the Ref as a service for test helpers

    return {
      sendEmail: ({ from, to, subject, body }) =>
        Ref.update(sentEmailsRef, (emails) => [
          ...emails,
          { from, to, subject, body },
        ]),
    };
  }),
);

// --- Test Helpers ---
export const EmailServiceTestHelpers = {
  getSentEmails: () => Effect.flatMap(SentEmails, (ref) => Ref.get(ref)),
  clear: () => Effect.flatMap(SentEmails, (ref) => Ref.set(ref, [])),
};
