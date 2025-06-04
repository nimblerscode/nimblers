"use server";

import { env } from "cloudflare:workers";
import { Effect, pipe } from "effect";
import { ConversationDOService } from "@/infrastructure/cloudflare/durable-objects/conversation/service";
import { ConversationDOLive } from "@/config/layers";
import type {
  ConversationId,
  GetConversationResponse,
  MessageContent,
} from "@/domain/tenant/conversations/models";

export async function getConversation(
  conversationId: ConversationId
): Promise<GetConversationResponse> {
  try {
    const program = ConversationDOService.pipe(
      Effect.flatMap((service) => service.getConversation(conversationId))
    );

    const fullLayer = ConversationDOLive({
      CONVERSATION_DO: env.CONVERSATION_DO,
    });

    const conversation = await Effect.runPromise(
      program.pipe(Effect.provide(fullLayer))
    );

    return {
      conversation,
    };
  } catch (error) {
    // Since the type requires conversation to always be present,
    // we need to throw or return a default conversation.
    // For now, let's re-throw to maintain the effect pattern
    throw new Error("Failed to fetch conversation");
  }
}

export async function sendMessage(
  conversationId: ConversationId,
  content: MessageContent
) {
  const program = pipe(
    Effect.gen(function* (_) {
      const sendMessageProgram = ConversationDOService.pipe(
        Effect.flatMap((service) =>
          service.sendMessage(conversationId, content)
        )
      );

      const messageLayer = ConversationDOLive({
        CONVERSATION_DO: env.CONVERSATION_DO,
      });

      const result = yield* _(
        Effect.tryPromise({
          try: () =>
            Effect.runPromise(
              sendMessageProgram.pipe(Effect.provide(messageLayer))
            ),
          catch: (error) => new Error("Failed to send message"),
        })
      );

      return {
        message: {
          content: result.message.content,
          direction: result.message.direction,
          id: result.message.id,
          status: result.message.status,
          messageType: result.message.messageType ?? null,
          externalMessageId: result.message.externalMessageId ?? null,
          sentAt: result.message.sentAt?.toISOString() ?? null,
          deliveredAt: result.message.deliveredAt?.toISOString() ?? null,
          readAt: result.message.readAt?.toISOString() ?? null,
          failedAt: result.message.failedAt?.toISOString() ?? null,
          createdAt: result.message.createdAt.toISOString(),
          metadata: result.message.metadata ?? null,
          failureReason: result.message.failureReason ?? null,
        },
      };
    }),
    Effect.catchAll((error) =>
      Effect.succeed({ error: "Failed to send message" })
    )
  );

  return Effect.runPromise(program);
}
