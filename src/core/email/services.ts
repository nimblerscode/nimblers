import { Context, Data, Effect, Layer, Ref } from "effect";

// --- Email Error Definition ---
export class EmailError extends Data.TaggedError("EmailError")<{
  message: string;
  cause?: unknown; // For wrapping underlying errors
}> {}

export class EmailService extends Context.Tag("core/email/EmailService")<
  EmailService,
  {
    readonly sendEmail: ({
      from,
      to,
      subject,
      body,
    }: {
      from: string;
      to: string;
      subject: string;
      body: string;
    }) => Effect.Effect<void, EmailError>;
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

    // Mock implementation for sendEmail
    const sendEmailImpl = ({
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
      Ref.update(sentEmailsRef, (emails) => [
        ...emails,
        { from, to, subject, body },
      ]);

    return {
      sendEmail: sendEmailImpl,
    };
  })
);

// --- Test Helpers ---
export const EmailServiceTestHelpers = {
  getSentEmails: () => Effect.flatMap(SentEmails, (ref) => Ref.get(ref)),
  clear: () => Effect.flatMap(SentEmails, (ref) => Ref.set(ref, [])),
};
