import { Context, type Effect, type Ref } from "effect";
import type { CreateEmailResponse } from "resend";
import type { EmailError } from "./model";

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
    }) => Effect.Effect<CreateEmailResponse, EmailError>;
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
