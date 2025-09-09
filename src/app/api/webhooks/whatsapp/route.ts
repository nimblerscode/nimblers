import { env } from "cloudflare:workers";
import { Effect, Schema, pipe } from "effect";
import { FetchHttpClient } from "@effect/platform";
import {
  WhatsAppWebhookPayload,
  WhatsAppProviderError,
} from "@/domain/global/messaging/models";
import {
  unsafeConversationId,
  unsafePhoneNumber,
  unsafeMessageContent,
  unsafeOrganizationSlug,
  unsafeExternalMessageId,
  unsafeMessageId,
} from "@/domain/tenant/shared/branded-types";
import { createConversationDOClient } from "@/infrastructure/cloudflare/durable-objects/conversation/api/client";

/**
 * GET handler for WhatsApp webhook verification
 * Facebook/Meta sends a GET request to verify the webhook URL
 */
function handleWebhookVerification(request: Request): Response {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  // Verify webhook with the token from environment
  const verifyToken = env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * POST handler for WhatsApp webhook events
 * Facebook/Meta sends webhook events for incoming messages and status updates
 */
async function handleWebhookEvents(request: Request): Promise<Response> {
  const program = pipe(
    Effect.gen(function* () {
      // Parse request body
      const body = yield* Effect.tryPromise({
        try: () => request.json(),
        catch: (error) =>
          new WhatsAppProviderError({
            message: `Failed to parse webhook body: ${String(error)}`,
          }),
      });

      // Validate webhook payload structure
      const webhookPayload = yield* Schema.decodeUnknown(
        WhatsAppWebhookPayload
      )(body).pipe(
        Effect.mapError(
          (error) =>
            new WhatsAppProviderError({
              message: `Invalid webhook payload: ${error.message}`,
            })
        )
      );

      yield* Effect.logInfo("WhatsApp webhook received", {
        object: webhookPayload.object,
        entryCount: webhookPayload.entry.length,
      });

      // Process each webhook entry
      yield* Effect.all(
        webhookPayload.entry.map((entry) =>
          Effect.gen(function* () {
            yield* Effect.logInfo("Processing WhatsApp webhook entry", {
              businessAccountId: entry.id,
              changesCount: entry.changes.length,
            });

            // Process each change in the entry
            yield* Effect.all(
              entry.changes.map((change) =>
                Effect.gen(function* () {
                  const { value } = change;

                  // Handle incoming messages
                  if (value.messages && value.messages.length > 0) {
                    yield* Effect.all(
                      value.messages.map((message) =>
                        Effect.gen(function* () {
                          yield* Effect.logInfo(
                            "Processing incoming WhatsApp message",
                            {
                              messageId: message.id,
                              from: message.from,
                              type: message.type,
                              timestamp: message.timestamp,
                            }
                          );

                          // Extract message content based on type
                          let content = "";
                          if (message.type === "text" && message.text) {
                            content = message.text.body;
                          } else if (
                            message.type === "image" &&
                            message.image
                          ) {
                            content =
                              message.image.caption ||
                              `[Image: ${message.image.filename || "image"}]`;
                          } else if (
                            message.type === "document" &&
                            message.document
                          ) {
                            content =
                              message.document.caption ||
                              `[Document: ${
                                message.document.filename || "document"
                              }]`;
                          } else {
                            content = `[${message.type.toUpperCase()} message]`;
                          }

                          // Create conversation ID based on customer phone
                          const customerPhone = unsafePhoneNumber(message.from);
                          const storePhone = unsafePhoneNumber(
                            value.metadata.display_phone_number
                          );
                          const conversationId = unsafeConversationId(
                            `whatsapp-${customerPhone.replace("+", "")}`
                          );

                          // TODO: Get organization slug from phone number mapping
                          // For now, using a default organization
                          const organizationSlug =
                            unsafeOrganizationSlug("nimblers-org");

                          // Get conversation DO and handle the message
                          const conversationDONamespace = env.CONVERSATION_DO;
                          const doId =
                            conversationDONamespace.idFromName(conversationId);
                          const conversationDO =
                            conversationDONamespace.get(doId);

                          const conversationClient =
                            yield* createConversationDOClient(
                              conversationDO,
                              conversationId
                            );

                          // First, ensure conversation exists
                          const conversation =
                            yield* conversationClient.conversations
                              .getConversation()
                              .pipe(
                                Effect.catchTag("HttpApiDecodeError", () =>
                                  // Create conversation if it doesn't exist
                                  conversationClient.conversations.createConversation(
                                    {
                                      payload: {
                                        organizationSlug,
                                        campaignId: null,
                                        customerPhone,
                                        storePhone,
                                        status: "active",
                                        metadata: JSON.stringify({
                                          source: "whatsapp_webhook",
                                          platform: "whatsapp",
                                          firstMessage: content,
                                        }),
                                      },
                                    }
                                  )
                                )
                              );

                          // Send the incoming message to the conversation
                          const result =
                            yield* conversationClient.conversations.receiveMessage(
                              {
                                payload: {
                                  // Use the external message ID directly from WhatsApp
                                  MessageSid: unsafeExternalMessageId(
                                    message.id
                                  ),
                                  From: customerPhone,
                                  To: storePhone,
                                  Body: unsafeMessageContent(content),
                                  // Also include generic format for compatibility
                                  id: unsafeMessageId(message.id),
                                  from: customerPhone,
                                  to: storePhone,
                                  content: unsafeMessageContent(content),
                                },
                              }
                            );

                          yield* Effect.logInfo(
                            "WhatsApp message stored, now triggering AI processing",
                            {
                              conversationId,
                              messageId: result.messageId,
                            }
                          );

                          // Now trigger AI processing by calling handleIncomingSMS
                          const aiResult =
                            yield* conversationClient.conversations.handleIncomingSMS(
                              {
                                payload: {
                                  From: customerPhone,
                                  To: storePhone,
                                  Body: unsafeMessageContent(content),
                                  MessageSid: unsafeExternalMessageId(
                                    message.id
                                  ), // Required field
                                  conversationId,
                                  organizationSlug,
                                  shopifyStoreDomain:
                                    "nimblers-dev.myshopify.com", // Using actual store domain
                                },
                              }
                            );

                          yield* Effect.logInfo(
                            "WhatsApp message processed successfully",
                            {
                              conversationId,
                              messageId: result.messageId,
                              status: result.status,
                              aiProcessed: aiResult.success,
                            }
                          );

                          return result;
                        })
                      ),
                      { concurrency: 5 }
                    );
                  }

                  // Handle message status updates
                  if (value.statuses && value.statuses.length > 0) {
                    yield* Effect.all(
                      value.statuses.map((status) =>
                        Effect.gen(function* () {
                          yield* Effect.logInfo(
                            "Processing WhatsApp status update",
                            {
                              messageId: status.id,
                              status: status.status,
                              recipientId: status.recipient_id,
                              timestamp: status.timestamp,
                            }
                          );

                          // TODO: Update message status in conversation
                          // This would involve finding the conversation and updating the message status
                          // For now, just log the status update

                          return {
                            messageId: status.id,
                            status: status.status,
                          };
                        })
                      ),
                      { concurrency: 5 }
                    );
                  }
                })
              ),
              { concurrency: 3 }
            );
          })
        ),
        { concurrency: 2 }
      );

      return { success: true, processed: true };
    }),
    Effect.catchAll((error) => {
      return Effect.gen(function* () {
        yield* Effect.logError("WhatsApp webhook processing failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return { success: false, processed: false };
      });
    })
  );

  const result = await Effect.runPromise(
    program.pipe(Effect.provide(FetchHttpClient.layer))
  );

  // Return 200 to acknowledge receipt (so Facebook doesn't retry)
  return Response.json(result, { status: 200 });
}

/**
 * Main POST export for RedwoodSDK
 */
export async function POST(request: Request): Promise<Response> {
  return handleWebhookEvents(request);
}

/**
 * Main GET export for RedwoodSDK
 */
export function GET(request: Request): Response {
  return handleWebhookVerification(request);
}

/**
 * Handle other HTTP methods
 */
export async function PUT() {
  return new Response("Method not allowed", { status: 405 });
}

export async function DELETE() {
  return new Response("Method not allowed", { status: 405 });
}
