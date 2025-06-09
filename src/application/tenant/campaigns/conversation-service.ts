import {
  CampaignConversationNotFoundError,
  CampaignConversationRepo,
  CampaignConversationUseCase,
} from "@/domain/tenant/campaigns/conversation-service";
import type {
  CampaignId,
  CreateCampaignConversationInput,
  ListCampaignConversationsInput,
  PhoneNumber,
  UpdateCampaignConversationInput,
} from "@/domain/tenant/campaigns/models";
import { unsafeConversationId } from "@/domain/tenant/shared/branded-types";
import { Effect, Layer } from "effect";
import { nanoid } from "nanoid";

export const CampaignConversationUseCaseLive = Layer.effect(
  CampaignConversationUseCase,
  Effect.gen(function* () {
    const campaignConversationRepo = yield* CampaignConversationRepo;

    return {
      createConversation: (input: CreateCampaignConversationInput) =>
        Effect.gen(function* () {
          // Generate conversation ID if not provided
          const conversationId =
            input.conversationId || unsafeConversationId(nanoid());

          const conversationData = {
            ...input,
            conversationId,
          };

          const conversation = yield* campaignConversationRepo.create(
            conversationData
          );
          return conversation;
        }).pipe(
          Effect.withSpan("CampaignConversationUseCase.createConversation")
        ),

      getConversation: (id: string) =>
        Effect.gen(function* () {
          const conversation = yield* campaignConversationRepo.findById(id);

          if (!conversation) {
            return yield* Effect.fail(
              new CampaignConversationNotFoundError({
                message: "Campaign conversation not found",
              })
            );
          }

          return conversation;
        }).pipe(Effect.withSpan("CampaignConversationUseCase.getConversation")),

      listCampaignConversations: (input: ListCampaignConversationsInput) =>
        Effect.gen(function* () {
          const conversations = yield* campaignConversationRepo.listByCampaign(
            input
          );
          return conversations;
        }).pipe(
          Effect.withSpan(
            "CampaignConversationUseCase.listCampaignConversations"
          )
        ),

      updateConversation: (
        id: string,
        input: UpdateCampaignConversationInput
      ) =>
        Effect.gen(function* () {
          const conversation = yield* campaignConversationRepo.update(
            id,
            input
          );
          return conversation;
        }).pipe(
          Effect.withSpan("CampaignConversationUseCase.updateConversation")
        ),

      deleteConversation: (id: string) =>
        Effect.gen(function* () {
          yield* campaignConversationRepo.delete(id);
        }).pipe(
          Effect.withSpan("CampaignConversationUseCase.deleteConversation")
        ),

      createConversationsForCustomers: (
        campaignId: CampaignId,
        customerPhones: string[]
      ) =>
        Effect.gen(function* () {
          // Create conversation inputs for all customers
          const conversationInputs: CreateCampaignConversationInput[] =
            customerPhones.map((phone) => {
              const conversationId = nanoid();

              // Validate conversation ID generation
              if (!conversationId || conversationId.trim().length === 0) {
                throw new Error(
                  `Failed to generate conversation ID for customer ${phone}`
                );
              }

              return {
                campaignId,
                conversationId: unsafeConversationId(conversationId), // Create deterministic conversation ID
                customerPhone: phone as PhoneNumber, // Cast to PhoneNumber branded type
                metadata: {
                  source: "campaign_creation",
                  createdAt: new Date().toISOString(),
                },
              };
            });

          // Bulk create all conversations
          const conversations = yield* campaignConversationRepo.bulkCreate(
            conversationInputs
          );
          return conversations;
        }).pipe(
          Effect.withSpan(
            "CampaignConversationUseCase.createConversationsForCustomers"
          )
        ),

      findConversationsByCustomerPhone: (customerPhone: PhoneNumber) =>
        Effect.gen(function* () {
          const conversations =
            yield* campaignConversationRepo.findByCustomerPhone(customerPhone);
          return conversations;
        }).pipe(
          Effect.withSpan(
            "CampaignConversationUseCase.findConversationsByCustomerPhone"
          )
        ),
    } as const;
  })
);
