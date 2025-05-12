import { Context, Layer } from "effect";
import type { Resend } from "resend";
import { email } from "./resendInstance";

export class EmailConfig extends Context.Tag("infra/email/EmailConfig")<
  EmailConfig,
  Resend
>() {}

export const ResendConfigLive = Layer.succeed(EmailConfig, email);
