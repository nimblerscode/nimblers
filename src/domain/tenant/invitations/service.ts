import { Context, type Effect, type Option } from "effect";
import type { Email } from "@/domain/global/email/model";
import type {
  GetInvitationError,
  InvalidToken,
  Invitation,
  InvitationError,
  InvitationId,
  InvitationStatus,
  NewInvitation,
} from "@/domain/tenant/invitations/models";
import type { OrgDbError } from "@/domain/tenant/organization/model";

export abstract class InvitationRepo extends Context.Tag(
  "@core/organization/InvitationRepo"
)<
  InvitationRepo,
  {
    readonly create: (
      invitationData: NewInvitation
    ) => Effect.Effect<Invitation, OrgDbError>; // Return both invitation and token
    readonly findPendingByEmail: (
      email: Email
    ) => Effect.Effect<Option.Option<Invitation>, OrgDbError>;
    readonly findAll: () => Effect.Effect<Invitation[], OrgDbError>;
    readonly updateStatus: (
      invitationId: InvitationId,
      status: InvitationStatus
    ) => Effect.Effect<Invitation, OrgDbError>;
    readonly getInvitation: (
      invitationId: InvitationId
    ) => Effect.Effect<Option.Option<Invitation>, OrgDbError>;
  }
>() {}

export class InvitationUseCase extends Context.Tag(
  "@core/organization/invitations/use-cases/InvitationUseCase"
)<
  InvitationUseCase,
  {
    readonly create: (
      input: NewInvitation
    ) => Effect.Effect<Invitation, InvitationError | OrgDbError>;
    readonly get: (
      token: string // Accept token for validation
    ) => Effect.Effect<Invitation, GetInvitationError | InvalidToken>;
    readonly list: () => Effect.Effect<
      Invitation[],
      InvitationError | OrgDbError
    >;
    // readonly accept: (
    //   token: string
    // ) => Effect.Effect<Member, GetInvitationError | InvalidToken>;
  }
>() {}
