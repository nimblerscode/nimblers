import type { env } from "cloudflare:workers";
import { Headers } from "@effect/platform";
import { Context, Data, Effect, Layer } from "effect";
import { InvitationDOService } from "@/application/tenant/invitations/service";
import type {
  Invitation,
  NewInvitation,
} from "@/domain/tenant/invitations/models";
import {
  InvalidToken,
  InvitationNotFound,
} from "@/domain/tenant/invitations/models";
import { InviteToken } from "@/domain/tenant/invitations/tokenUtils";
import { OrgDbError } from "@/domain/tenant/organization/model";

// Custom error for DO interactions
export class DOInteractionError extends Data.TaggedError("DOInteractionError")<{
  readonly message: string;
  readonly status?: number;
  readonly slug?: string;
  readonly originalError?: unknown;
}> {}

// --- Required Dependency Tag ---
// The DO namespace needed by the live service
export class InvitationDONamespace extends Context.Tag(
  "cloudflare/bindings/INVITATION_DO_NAMESPACE"
)<
  InvitationDONamespace, // The service itself (though it's just holding the namespace)
  typeof env.ORG_DO // Use DurableObjectNamespace directly, let TS infer or it defaults appropriately
>() {}

// Live Implementation Layer
export const InvitationDOServiceLive = Layer.effect(
  InvitationDOService,
  Effect.gen(function* () {
    const invitationDONamespace = yield* InvitationDONamespace;
    const inviteToken = yield* InviteToken;
    return {
      get: (token: string) => {
        return Effect.gen(function* () {
          const { doId } = yield* inviteToken.verify(token).pipe(
            Effect.mapError(
              (error) =>
                new InvalidToken({
                  message: error.message,
                })
            )
          );

          const id = invitationDONamespace.idFromString(doId.toString());
          const stub = invitationDONamespace.get(id);
          const response = yield* Effect.tryPromise({
            try: async () => {
              const res = await stub.fetch(
                `http://internal/invitations/${doId}?token=${token}`,
                {
                  method: "GET",
                }
              );
              console.log("res from invitation do", res);
              const invitation = (await res.json()) as Invitation;
              if (!res.ok) {
                throw new DOInteractionError({
                  message: JSON.stringify(invitation),
                  status: res.status,
                });
              }
              console.log("invitation", invitation);
              return invitation;
            },
            catch: (error) => {
              return new InvalidToken({
                message:
                  "Error retrieving invitation: " +
                  (error instanceof Error ? error.message : String(error)),
              });
            },
          });
          return response;
        });
      },
      accept: (token: string) => {
        // TODO change the token param to the invitation id
        console.log("InvitationDO accept", token);
        return Effect.gen(function* () {
          const doId = invitationDONamespace.idFromName(token);
          const stub = invitationDONamespace.get(doId);
          const response = yield* Effect.tryPromise({
            try: async () => {
              const res = await stub.fetch("http://internal/invite/accept", {
                method: "POST",
                headers: Headers.unsafeFromRecord({
                  "Content-Type": "application/json",
                }),
                body: JSON.stringify({
                  token,
                }),
              });
              const json = (await res.json()) as {
                ok: boolean;
              };
              if (!res.ok) {
                throw new DOInteractionError({
                  message: JSON.stringify(json),
                  status: res.status,
                });
              }
              return {
                ok: json.ok,
              };
            },
            catch: (error) => {
              return new InvitationNotFound({
                message:
                  "Error accepting invitation: " +
                  (error instanceof Error ? error.message : String(error)),
              });
            },
          });
          return response;
        });
      },
      create: (newInvitation: NewInvitation, organizationSlug: string) => {
        console.log("InvitationDO create", newInvitation, organizationSlug);
        return Effect.gen(function* () {
          const doId = invitationDONamespace.idFromName(organizationSlug);
          const stub = invitationDONamespace.get(doId);
          console.log("newInvitation", newInvitation);
          const response = yield* Effect.tryPromise({
            try: async () => {
              console.log("Creating invitation with payload:", {
                newInvitation,
              });
              const response = await stub.fetch("http://internal/invite", {
                method: "POST",
                headers: Headers.unsafeFromRecord({
                  "Content-Type": "application/json",
                }),
                body: JSON.stringify({ newInvitation }),
              });
              console.log("Response status:", response.status);
              console.log(
                "Response headers:",
                Object.fromEntries(response.headers.entries())
              );
              // If response is not ok, throw error regardless of body content
              if (!response.ok) {
                throw new OrgDbError({
                  cause: new Error(
                    `Server responded with status ${response.status}`
                  ),
                });
              }

              try {
                const res = (await response.json()) as Invitation;
                return res;
              } catch {
                throw new OrgDbError({
                  cause: new Error("Invalid JSON response from server"),
                });
              }
            },
            catch: (error) => {
              console.error("Error in invitation creation:", error);
              if (error instanceof OrgDbError) {
                return error;
              }
              return new OrgDbError({
                cause:
                  error instanceof Error ? error : new Error(String(error)),
              });
            },
          });
          return response;
        });
      },
      list: (organizationSlug: string) => {
        console.log("InvitationDO list", organizationSlug);
        return Effect.gen(function* () {
          const doId = invitationDONamespace.idFromName(organizationSlug);
          const stub = invitationDONamespace.get(doId);
          const response = yield* Effect.tryPromise({
            try: async () => {
              console.log(
                "Fetching invitations for organization:",
                organizationSlug
              );
              const response = await stub.fetch("http://internal/invitations", {
                method: "GET",
                headers: Headers.unsafeFromRecord({
                  "Content-Type": "application/json",
                }),
              });
              console.log("Response status:", response.status);

              if (!response.ok) {
                throw new OrgDbError({
                  cause: new Error(
                    `Server responded with status ${response.status}`
                  ),
                });
              }

              try {
                const res = (await response.json()) as Invitation[];
                return res;
              } catch {
                throw new OrgDbError({
                  cause: new Error("Invalid JSON response from server"),
                });
              }
            },
            catch: (error) => {
              console.error("Error in invitation listing:", error);
              if (error instanceof OrgDbError) {
                return error;
              }
              return new OrgDbError({
                cause:
                  error instanceof Error ? error : new Error(String(error)),
              });
            },
          });
          return response;
        });
      },
    };
  })
);
