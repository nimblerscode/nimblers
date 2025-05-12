import { Context, type Effect, type Option } from "effect";
import type {
  Email,
  Invitation,
  InvitationStatus,
  NewInvitation,
} from "../invitations/models";
import type { OrgDbError } from "../service";

export abstract class OrgInvitationRepo extends Context.Tag(
  "@core/organization/OrgInvitationRepo",
)<
  OrgInvitationRepo,
  {
    readonly create: (
      invitationData: NewInvitation,
    ) => Effect.Effect<Invitation, OrgDbError>; // Effect error type is OrgDbError, success is Invitation
    readonly findById: (
      id: Invitation["id"], // Use branded InvitationId
    ) => Effect.Effect<Option.Option<Invitation>, OrgDbError>; // Effect error type is OrgDbError, success is Option<Invitation>
    readonly findByOrgIdAndEmailAndStatus: (
      orgId: Invitation["organizationId"], // Use branded OrganizationId
      email: Email, // Use branded Email
      status: InvitationStatus,
    ) => Effect.Effect<Option.Option<Invitation>, OrgDbError>; // Effect error type is OrgDbError, success is Option<Invitation>
    readonly updateStatus: (
      id: Invitation["id"], // Use branded InvitationId
      status: InvitationStatus,
      acceptedAt?: Date, // Domain expects Date, maps to number in schema
    ) => Effect.Effect<Invitation, OrgDbError>; // Effect error type is OrgDbError, success is Invitation
    readonly findPendingByOrgIdAndEmail: (
      orgId: Invitation["organizationId"], // Use branded OrganizationId
      email: Email, // Use branded Email
    ) => Effect.Effect<Option.Option<Invitation>, OrgDbError>; // Effect error type is OrgDbError, success is Option<Invitation>
    readonly findExpiredPending: (
      now: Date,
    ) => Effect.Effect<ReadonlyArray<Invitation>, OrgDbError>; // Effect error type is OrgDbError, success is ReadonlyArray<Invitation>
  }
>() {}
