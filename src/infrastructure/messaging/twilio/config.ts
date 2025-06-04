import { Context } from "effect";
import type { PhoneNumber } from "@/domain/global/messaging/models";

// Twilio configuration interface
export interface TwilioConfiguration {
  readonly accountSid: string;
  readonly authToken: string;
  readonly fromNumber: PhoneNumber;
  readonly webhookUrl?: string;
}

// Twilio configuration service
export abstract class TwilioConfig extends Context.Tag(
  "@messaging/TwilioConfig"
)<TwilioConfig, TwilioConfiguration>() {}
