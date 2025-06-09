import { Context, Data, Effect } from "effect";
import type {
  CampaignConversation,
  CreateCampaignConversationInput,
  UpdateCampaignConversationInput,
  ListCampaignConversationsInput,
  CampaignId,
  ConversationId,
  PhoneNumber,
} from "./models";

// Error Types
export class CampaignConversationNotFoundError extends Data.TaggedError(
  "CampaignConversationNotFoundError"
)<{
  readonly campaignId?: CampaignId;
  readonly conversationId?: ConversationId;
  readonly message: string;
}> {}

export class CampaignConversationDbError extends Data.TaggedError(
  "CampaignConversationDbError"
)<{
  readonly message: string;
  readonly cause?: unknown;
  readonly table?: string;
  readonly operation?: string;
}> {}

export type CampaignConversationError =
  | CampaignConversationNotFoundError
  | CampaignConversationDbError;

// Repository Interface
export abstract class CampaignConversationRepo extends Context.Tag(
  "@core/CampaignConversationRepo"
)<
  CampaignConversationRepo,
  {
    readonly create: (
      input: CreateCampaignConversationInput
    ) => Effect.Effect<CampaignConversation, CampaignConversationDbError>;

    readonly findById: (
      id: string
    ) => Effect.Effect<
      CampaignConversation | null,
      CampaignConversationDbError
    >;

    readonly findByCampaignAndConversation: (
      campaignId: CampaignId,
      conversationId: ConversationId
    ) => Effect.Effect<
      CampaignConversation | null,
      CampaignConversationDbError
    >;

    readonly listByCampaign: (
      input: ListCampaignConversationsInput
    ) => Effect.Effect<CampaignConversation[], CampaignConversationDbError>;

    readonly update: (
      id: string,
      input: UpdateCampaignConversationInput
    ) => Effect.Effect<CampaignConversation, CampaignConversationDbError>;

    readonly delete: (
      id: string
    ) => Effect.Effect<void, CampaignConversationDbError>;

    readonly bulkCreate: (
      inputs: CreateCampaignConversationInput[]
    ) => Effect.Effect<CampaignConversation[], CampaignConversationDbError>;

    readonly findByCustomerPhone: (
      customerPhone: PhoneNumber
    ) => Effect.Effect<CampaignConversation[], CampaignConversationDbError>;
  }
>() {}

// Use Case Interface
export abstract class CampaignConversationUseCase extends Context.Tag(
  "@core/CampaignConversationUseCase"
)<
  CampaignConversationUseCase,
  {
    readonly createConversation: (
      input: CreateCampaignConversationInput
    ) => Effect.Effect<CampaignConversation, CampaignConversationError>;

    readonly getConversation: (
      id: string
    ) => Effect.Effect<CampaignConversation, CampaignConversationError>;

    readonly listCampaignConversations: (
      input: ListCampaignConversationsInput
    ) => Effect.Effect<CampaignConversation[], CampaignConversationError>;

    readonly updateConversation: (
      id: string,
      input: UpdateCampaignConversationInput
    ) => Effect.Effect<CampaignConversation, CampaignConversationError>;

    readonly deleteConversation: (
      id: string
    ) => Effect.Effect<void, CampaignConversationError>;

    readonly createConversationsForCustomers: (
      campaignId: CampaignId,
      customerPhones: string[]
    ) => Effect.Effect<CampaignConversation[], CampaignConversationError>;

    readonly findConversationsByCustomerPhone: (
      customerPhone: PhoneNumber
    ) => Effect.Effect<CampaignConversation[], CampaignConversationError>;
  }
>() {}
