"use server";

import { env } from "cloudflare:workers";
import { Effect, pipe } from "effect";
import { ConversationDOService } from "@/infrastructure/cloudflare/durable-objects/conversation/service";
import { ConversationDOLive } from "@/config/layers";
import {
  type GetConversationResponse,
  type SendMessageResponse,
  conversationToSerializable,
} from "@/domain/tenant/conversations/models";

export async function getConversation(
  conversationId: string
): Promise<GetConversationResponse> {
  const program = pipe(
    Effect.gen(function* (_) {
      const conversationProgram = ConversationDOService.pipe(
        Effect.flatMap((service) => service.getConversation(conversationId))
      );

      const fullLayer = ConversationDOLive({
        CONVERSATION_DO: env.CONVERSATION_DO,
      });

      const conversation = yield* _(
        Effect.tryPromise({
          try: () =>
            Effect.runPromise(
              conversationProgram.pipe(Effect.provide(fullLayer))
            ),
          catch: (error) => new Error(`Failed to fetch conversation: ${error}`),
        })
      );

      return {
        conversation: conversationToSerializable({
          ...conversation,
          metadata: conversation.metadata ?? null,
          campaignId: conversation.campaignId ?? null,
          lastMessageAt: conversation.lastMessageAt ?? null,
        }),
      };
    }),
    Effect.catchAll((error) => {
      return Effect.succeed({
        conversation: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    })
  );

  return Effect.runPromise(program);
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<SendMessageResponse> {
  const program = pipe(
    Effect.gen(function* (_) {
      const messageProgram = ConversationDOService.pipe(
        Effect.flatMap((service) =>
          service.sendMessage(conversationId, content)
        )
      );

      const fullLayer = ConversationDOLive({
        CONVERSATION_DO: env.CONVERSATION_DO,
      });

      yield* _(
        Effect.tryPromise({
          try: () =>
            Effect.runPromise(messageProgram.pipe(Effect.provide(fullLayer))),
          catch: (error) => new Error(`Failed to send message: ${error}`),
        })
      );

      return { success: true };
    }),
    Effect.catchAll((error) => {
      return Effect.succeed({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    })
  );

  return Effect.runPromise(program);
}
