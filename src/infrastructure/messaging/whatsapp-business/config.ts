import { Layer, Context } from "effect";
import { WhatsAppBusinessConfig } from "@/domain/global/messaging/models";

// WhatsApp Business API Client Configuration
export abstract class WhatsAppBusinessAPIConfig extends Context.Tag(
  "@messaging/WhatsAppBusinessAPIConfig"
)<WhatsAppBusinessAPIConfig, WhatsAppBusinessConfig>() {}

export function createWhatsAppBusinessConfigLayer(config: {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  webhookUrl?: string;
}) {
  return Layer.succeed(WhatsAppBusinessAPIConfig, {
    accessToken: config.accessToken,
    phoneNumberId: config.phoneNumberId,
    businessAccountId: config.businessAccountId,
    verifyToken: config.verifyToken,
    webhookUrl: config.webhookUrl,
  });
}
