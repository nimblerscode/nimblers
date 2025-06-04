"use server";

import { Effect, pipe } from "effect";
import {
  type MessageStatus,
  validateMessageId,
} from "@/domain/global/messaging/models";

// Twilio webhook payload schema
interface TwilioWebhookPayload {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  Body?: string;
  AccountSid: string;
  SmsSid?: string;
  SmsStatus?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  NumMedia?: string;
  ReferenceNumMedia?: string;
  [key: string]: string | undefined;
}

// Map Twilio status to our message status
function mapTwilioStatus(twilioStatus: string): MessageStatus {
  switch (twilioStatus.toLowerCase()) {
    case "queued":
    case "accepted":
      return "pending";
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "failed":
    case "undelivered":
      return "failed";
    case "read":
      return "read";
    default:
      return "pending";
  }
}

// Validate Twilio webhook signature (simplified - in production you'd verify the actual signature)
function validateWebhookAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const twilioSignature = request.headers.get("x-twilio-signature");

  // In production, you should verify the signature using Twilio's webhook signature validation
  // For now, just check that it looks like a Twilio request
  return authHeader !== null || twilioSignature !== null;
}

export async function handleTwilioWebhook(request: Request): Promise<Response> {
  try {
    // Validate request method
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Basic auth validation
    if (!validateWebhookAuth(request)) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse form data (Twilio sends webhooks as application/x-www-form-urlencoded)
    const formData = await request.formData();
    const payload: Partial<TwilioWebhookPayload> = {};

    for (const [key, value] of formData.entries()) {
      payload[key] = value.toString();
    }

    // Extract required fields
    const messageSid = payload.MessageSid || payload.SmsSid;
    const messageStatus = payload.MessageStatus || payload.SmsStatus;

    if (!messageSid || !messageStatus) {
      return new Response("Bad request: missing required fields", {
        status: 400,
      });
    }

    // Process the webhook
    const program = pipe(
      Effect.gen(function* () {
        // Validate message ID
        const validatedMessageId = yield* validateMessageId(messageSid);

        // Map status
        const mappedStatus = mapTwilioStatus(messageStatus);

        // Here you could update your database with the new status
        // For now, we'll just return success
        // In a full implementation, you'd have a use case to update message status

        return {
          messageId: validatedMessageId,
          status: mappedStatus,
          processed: true,
        };
      }),
      Effect.catchAll(() => {
        return Effect.succeed({
          processed: false,
        });
      })
    );

    const result = await Effect.runPromise(program);

    if (result.processed) {
      return new Response("OK", { status: 200 });
    }

    return new Response("Processing failed", { status: 500 });
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
}
