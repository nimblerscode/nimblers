import { env } from "cloudflare:workers";
import { Effect, pipe, Layer } from "effect";
import { FetchHttpClient } from "@effect/platform";
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
import { createConversationDOClient } from "@/infrastructure/cloudflare/durable-objects/conversation/api/client";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";
import { OrgD1Service } from "@/domain/global/organization/service";
import { DatabaseLive } from "@/config/layers";
import { OrgRepoD1LayerLive } from "@/infrastructure/persistence/global/d1/OrgD1RepoLive";

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

  // For debugging - log auth headers but don't throw errors
  console.log("WEBHOOK_AUTH_DEBUG:", {
    hasAuthHeader: !!authHeader,
    hasTwilioSignature: !!twilioSignature,
  });

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

  console.log(
    `📊 Processing status callback: ${messageSid} -> ${messageStatus}`
  );

  const program = pipe(
    Effect.gen(function* () {
      // Validate message ID
      const validatedMessageId = yield* validateMessageId(messageSid);

      // Map status
      const mappedStatus = mapTwilioStatus(messageStatus);

      // Log status update for now - in the future we could update message status in the conversation DOs
      yield* Effect.log("Status callback received", {
        messageSid: validatedMessageId,
        status: mappedStatus,
        originalStatus: messageStatus,
      });

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

// Handle incoming message using ConversationDO handler
async function handleIncomingMessageWithDO(
  formData: FormData
): Promise<Response> {
  try {
    // Parse the incoming message data using branded types
    const twilioData = {
      From: unsafePhoneNumber(formData.get("From") as string),
      To: unsafePhoneNumber(formData.get("To") as string),
      Body: unsafeMessageContent(formData.get("Body") as string),
      MessageSid: unsafeExternalMessageId(formData.get("MessageSid") as string),
    };

    const program = pipe(
      Effect.gen(function* () {
        // Look up organization by store phone number using D1 service
        yield* Effect.log("Looking up organization by store phone", {
          storePhone: twilioData.To,
          customerPhone: twilioData.From,
        });

        const orgD1Service = yield* OrgD1Service;

        const organizationSlug = yield* Effect.gen(function* () {
          try {
            const orgSlug = yield* orgD1Service.lookupOrganizationByStorePhone(
              twilioData.To
            );
            yield* Effect.log("Found organization for store phone", {
              storePhone: twilioData.To,
              organizationSlug: orgSlug,
            });
            return orgSlug;
          } catch (error) {
            yield* Effect.logWarning(
              "No organization found for store phone, using default",
              {
                storePhone: twilioData.To,
                error: error instanceof Error ? error.message : String(error),
              }
            );
            // Fallback to default organization
            return unsafeOrganizationSlug("nimblers-org");
          }
        });

        // Get organization DO and lookup existing conversation
        const organizationDONamespace = env.ORG_DO;
        const orgDoId = organizationDONamespace.idFromName(organizationSlug);
        const organizationDO = organizationDONamespace.get(orgDoId);

        yield* Effect.log("Creating organization DO client", {
          organizationSlug,
          orgDoId: orgDoId.toString(),
        });

        // Create organization DO client
        const orgClient = yield* createOrganizationDOClient(
          organizationDO,
          organizationSlug
        );

        let conversationId: string;
        let shopifyStoreDomain: string | undefined;

        // Try to find existing conversation
        const lookupResult = yield* Effect.gen(function* () {
          yield* Effect.log("Attempting conversation lookup", {
            customerPhone: twilioData.From,
            storePhone: twilioData.To,
            organizationSlug,
          });

          return yield* orgClient.organizations.lookupConversation({
            urlParams: {
              customerPhone: twilioData.From,
              storePhone: twilioData.To,
            },
          });
        }).pipe(
          Effect.tap((result) =>
            Effect.log("Conversation lookup successful", result)
          ),
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logError(
                "Conversation lookup failed - will create new conversation",
                {
                  error: error,
                  errorType: error?._tag,
                  errorMessage:
                    error instanceof Error ? error.message : String(error),
                }
              );
              return yield* Effect.succeed(null);
            })
          )
        );

        if (lookupResult) {
          conversationId = unsafeConversationId(lookupResult.conversationId);
          shopifyStoreDomain = lookupResult.shopifyStoreDomain;
        } else {
          // First, get connected Shopify stores
          const connectedStore = yield* Effect.gen(function* () {
            yield* Effect.log("Fetching connected Shopify stores", {
              organizationSlug,
            });

            const stores = yield* orgClient.organizations.getConnectedStores({
              path: { organizationSlug },
            });

            const activeStore = stores.find(
              (store) => store.status === "active"
            );
            yield* Effect.log("Found connected stores", {
              totalStores: stores.length,
              activeStore: activeStore?.shopDomain,
            });

            return activeStore?.shopDomain;
          }).pipe(
            Effect.catchAll((storeError) =>
              Effect.gen(function* () {
                yield* Effect.logWarning("Failed to fetch connected stores", {
                  error: storeError,
                  errorType: storeError?._tag,
                  errorMessage:
                    storeError instanceof Error
                      ? storeError.message
                      : String(storeError),
                });
                return yield* Effect.succeed(undefined);
              })
            )
          );

          // Create new conversation via conversation DO
          yield* Effect.log("Creating new conversation", {
            customerPhone: twilioData.From,
            storePhone: twilioData.To,
            connectedStore,
          });

          const conversationDONamespace = env.CONVERSATION_DO;
          const newConversationId = unsafeConversationId(crypto.randomUUID());
          const conversationDoId =
            conversationDONamespace.idFromName(newConversationId);
          const conversationDO = conversationDONamespace.get(conversationDoId);
          const conversationClient = yield* createConversationDOClient(
            conversationDO,
            newConversationId,
            connectedStore
          );

          const createResult =
            yield* conversationClient.conversations.createConversation({
              payload: {
                organizationSlug,
                campaignId: null,
                customerPhone: twilioData.From,
                storePhone: twilioData.To,
                status: "active",
                metadata: JSON.stringify({
                  source: "incoming_sms",
                  firstMessage: twilioData.Body,
                  shopifyStoreDomain: connectedStore,
                }),
              },
            });

          conversationId = unsafeConversationId(createResult.id);
          shopifyStoreDomain = connectedStore;
        }

        // Now use ConversationDO handler to process the message
        yield* Effect.log("=== USING CONVERSATION DO HANDLER ===", {
          conversationId,
          organizationSlug,
          shopifyStoreDomain,
        });

        // Use the conversation DO to handle the incoming SMS
        const conversationDONamespace = env.CONVERSATION_DO;
        const doId = conversationDONamespace.idFromName(conversationId);
        const conversationDO = conversationDONamespace.get(doId);
        const conversationClient = yield* createConversationDOClient(
          conversationDO,
          conversationId,
          shopifyStoreDomain
        );

        const doResponse =
          yield* conversationClient.conversations.handleIncomingSMS({
            payload: {
              From: twilioData.From,
              To: twilioData.To,
              Body: twilioData.Body,
              MessageSid: twilioData.MessageSid,
              conversationId: unsafeConversationId(conversationId),
              organizationSlug,
              shopifyStoreDomain,
            },
          });

        yield* Effect.log("=== CONVERSATION DO RESPONSE RECEIVED ===", {
          success: doResponse.success,
          responseMessage: doResponse.responseMessage,
          conversationId,
        });

        return doResponse;
      }),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError("Effect pipeline failed in DO processing", {
            error,
            errorType: error?._tag,
            errorMessage:
              error instanceof Error ? error.message : String(error),
          });
          return yield* Effect.fail(
            new Error("Failed to process message with ConversationDO")
          );
        })
      )
    );

    // Create the layer pipeline (no agent layer needed)
    const dbLayer = DatabaseLive({ DB: env.DB });
    const orgServiceLayer = Layer.provide(OrgRepoD1LayerLive, dbLayer);

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provide(orgServiceLayer)
      )
    );

    // Handle the response from ConversationDO
    if (!result.success) {
      throw new Error("ConversationDO failed to process message");
    }

    // Truncate message if it's too long for SMS (1600 character limit for safety)
    const MAX_SMS_LENGTH = 1600;
    let responseMessage = String(
      result.responseMessage || "Thank you for your message!"
    );

    // Check if the response looks like JSON and try to extract meaningful content
    if (
      responseMessage.trim().startsWith("{") ||
      responseMessage.trim().startsWith("[")
    ) {
      console.log(
        "⚠️ Response appears to be JSON, attempting to parse:",
        responseMessage.substring(0, 200)
      );
      try {
        const parsedResponse = JSON.parse(responseMessage);
        if (
          parsedResponse.message ||
          parsedResponse.content ||
          parsedResponse.text
        ) {
          responseMessage =
            parsedResponse.message ||
            parsedResponse.content ||
            parsedResponse.text;
          console.log("✅ Extracted message from JSON response");
        }
      } catch (e) {
        console.log("❌ Failed to parse JSON response, using as-is");
      }
    }

    if (responseMessage.length > MAX_SMS_LENGTH) {
      console.log(
        `⚠️ Message too long (${responseMessage.length} chars), truncating to ${MAX_SMS_LENGTH}`
      );
      responseMessage =
        responseMessage.substring(0, MAX_SMS_LENGTH - 3) + "...";
    }

    console.log(
      `📤 ConversationDO sent response (${responseMessage.length} chars):`,
      responseMessage.substring(0, 100) + "..."
    );

    // Return empty TwiML response since ConversationDO already sent the message via API
    // This prevents duplicate messages (one from API, one from TwiML)
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
    console.error("ConversationDO webhook error:", error);

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
      console.log(
        "📊 Processing status callback webhook - this updates message delivery status"
      );
      return await handleStatusCallback(formData);
    }

    console.log(
      "💬 Processing incoming message webhook from customer - this will generate AI response"
    );
    return await handleIncomingMessageWithDO(formData);
  } catch (error) {
    console.error("💥 WEBHOOK ERROR:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
