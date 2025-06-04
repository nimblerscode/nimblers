import { Context } from "effect";
import type { MessageProviderConfig } from "@/domain/global/messaging/models";

// Twilio configuration service
export abstract class TwilioConfig extends Context.Tag(
  "@messaging/TwilioConfig"
)<
  TwilioConfig,
  {
    readonly config: MessageProviderConfig;
  }
>() {}
