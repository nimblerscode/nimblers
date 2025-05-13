import { email } from "@/infrastructure/email/resend/instance";
import { Context, Layer } from "effect";
import type { Resend } from "resend";

export class EmailConfig extends Context.Tag("infra/email/EmailConfig")<
  EmailConfig,
  Resend
>() {}

export const ResendConfigLive = Layer.succeed(EmailConfig, email);
