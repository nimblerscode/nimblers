import { env } from "cloudflare:workers";
import { Effect, pipe } from "effect";
import {
  type MessageStatus,
  validateMessageId,
} from "@/domain/global/messaging/models";
import {
  unsafePhoneNumber,
  unsafeOrganizationSlug,
  unsafeConversationId,
  unsafeMessageContent,
  unsafeExternalMessageId,
} from "@/domain/tenant/shared/branded-types";

// Twilio webhook payload interfaces
interface TwilioIncomingMessage {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
}

interface TwilioStatusCallback {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  AccountSid: string;
  ErrorCode?: string;
  ErrorMessage?: string;
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

// Determine webhook type based on payload
function isStatusCallback(formData: FormData): boolean {
  // Status callbacks have MessageStatus field, incoming messages don't
  return formData.has("MessageStatus") && !formData.has("Body");
}

// Validate Twilio webhook (simplified - in production verify signature)
function validateWebhookAuth(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const twilioSignature = request.headers.get("x-twilio-signature");

  // For debugging - in production logs this should show up
  if (!authHeader && !twilioSignature) {
    throw new Error("WEBHOOK_AUTH_DEBUG: No auth headers found");
  }

  // Always return true for now to bypass auth during debugging
  return true;
}

// Handle status callback updates
async function handleStatusCallback(formData: FormData): Promise<Response> {
  const messageSid = formData.get("MessageSid") as string;
  const messageStatus = formData.get("MessageStatus") as string;

  if (!messageSid || !messageStatus) {
    return new Response("Bad request: missing required fields", {
      status: 400,
    });
  }

  const program = pipe(
    Effect.gen(function* () {
      // Validate message ID
      const validatedMessageId = yield* validateMessageId(messageSid);

      // Map status
      const mappedStatus = mapTwilioStatus(messageStatus);

      // TODO: Update message status in database
      // This would typically involve finding the message by external ID
      // and updating its status in the conversation

      // Log status update (replace with proper logging in production)

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

  return new Response("OK", {
    status: result.processed ? 200 : 500,
  });
}

// Handle incoming message
async function handleIncomingMessage(formData: FormData): Promise<Response> {
  try {
    // Parse the incoming message data using branded types
    const twilioData = {
      From: unsafePhoneNumber(formData.get("From") as string),
      To: unsafePhoneNumber(formData.get("To") as string),
      Body: unsafeMessageContent(formData.get("Body") as string),
      MessageSid: unsafeExternalMessageId(formData.get("MessageSid") as string),
    };

    // For now, extract organization from phone number or use default
    const organizationSlug = unsafeOrganizationSlug("nimblers-org");

    // Get the organization DO to lookup conversations
    const organizationDONamespace = env.ORG_DO;
    const orgDoId = organizationDONamespace.idFromName(organizationSlug);
    const organizationDO = organizationDONamespace.get(orgDoId);

    // Try to find existing conversation by phone numbers
    const conversationLookupResponse = await organizationDO.fetch(
      `http://internal/conversations/lookup?customerPhone=${encodeURIComponent(
        twilioData.From
      )}&storePhone=${encodeURIComponent(twilioData.To)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    let conversationId: string;
    let shopifyStoreDomain: string | undefined;

    if (conversationLookupResponse.ok) {
      // Found existing conversation
      const lookupResult = (await conversationLookupResponse.json()) as {
        conversationId: string;
        shopifyStoreDomain?: string;
      };
      conversationId = unsafeConversationId(lookupResult.conversationId);
      shopifyStoreDomain = lookupResult.shopifyStoreDomain;
    } else {
      // Create new conversation
      // First, get connected Shopify store
      const storesResponse = await organizationDO.fetch(
        `http://internal/${organizationSlug}/stores`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      let connectedStore: string | undefined;
      if (storesResponse.ok) {
        const stores = (await storesResponse.json()) as {
          stores: Array<{ shopDomain: string; isActive: boolean }>;
        };
        const activeStore = stores.stores.find((store) => store.isActive);
        connectedStore = activeStore?.shopDomain;
      }

      const createConversationResponse = await organizationDO.fetch(
        "http://internal/conversations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerPhone: twilioData.From,
            storePhone: twilioData.To,
            campaignId: null,
            status: "active",
            metadata: {
              source: "incoming_sms",
              firstMessage: twilioData.Body,
              shopifyStoreDomain: connectedStore,
            },
          }),
        }
      );

      if (!createConversationResponse.ok) {
        throw new Error(
          `Failed to create conversation: ${createConversationResponse.status}`
        );
      }

      const createResult = (await createConversationResponse.json()) as {
        conversationId: string;
      };
      conversationId = unsafeConversationId(createResult.conversationId);
      shopifyStoreDomain = connectedStore;
    }

    // Forward to conversation DO
    const conversationDONamespace = env.CONVERSATION_DO;
    const doId = conversationDONamespace.idFromName(conversationId);
    const conversationDO = conversationDONamespace.get(doId);

    const response = await conversationDO.fetch(
      "http://internal/sms/incoming",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Store-Domain":
            shopifyStoreDomain || "default-store.myshopify.com",
        },
        body: JSON.stringify({
          ...twilioData,
          conversationId,
          organizationSlug,
          shopifyStoreDomain,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to process message");
    }

    const result = (await response.json()) as { responseMessage?: string };

    // Return empty TwiML response - no automatic replies
    // The conversation DO will handle intelligent responses separately
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    // Log error (replace with proper logging in production)

    // Return fallback TwiML response
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>We received your message and will respond shortly.</Message>
</Response>`;

    return new Response(errorResponse, {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}

// Main webhook handler
export async function POST(request: Request) {
  console.log("🚀 TWILIO WEBHOOK CALLED - URL:", request.url);
  console.log(
    "🚀 TWILIO WEBHOOK HEADERS:",
    Object.fromEntries(request.headers.entries())
  );

  try {
    // Basic validation
    if (!validateWebhookAuth(request)) {
      console.log("❌ WEBHOOK AUTH FAILED");
      return new Response("Unauthorized", { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const formDataObj = Object.fromEntries(formData.entries());
    console.log("📥 TWILIO WEBHOOK DATA:", formDataObj);

    // Determine webhook type and route accordingly
    if (isStatusCallback(formData)) {
      console.log("📊 Processing status callback webhook");
      return await handleStatusCallback(formData);
    }

    console.log("💬 Processing incoming message webhook");
    return await handleIncomingMessage(formData);
  } catch (error) {
    console.error("💥 WEBHOOK ERROR:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
