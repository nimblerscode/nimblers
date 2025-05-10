import type { env } from "cloudflare:workers";
import { Context, Data, Effect, Layer } from "effect";
import type { OrgCreateData } from "./service";

// Payload for creating/initializing an organization in the DO
// This should be compatible with what orgCreatePayload was in your action
export type OrgDOCreationPayload = Pick<
  OrgCreateData,
  "name" | "slug" | "logo"
> & {
  creatorId: string;
};

// Custom error for DO interactions
export class DOInteractionError extends Data.TaggedError("DOInteractionError")<{
  readonly message: string;
  readonly status?: number;
  readonly slug?: string;
  readonly originalError?: unknown;
}> {}

// Rename the DO-based service port to "Provision" semantics
export class OrganizationProvisionService extends Context.Tag(
  "core/organization/OrganizationProvisionService",
)<
  OrganizationProvisionService,
  {
    readonly initializeOrganization: (
      payload: OrgDOCreationPayload,
    ) => Effect.Effect<OrgCreateData, DOInteractionError>;
  }
>() {}

// --- Required Dependency Tag ---
// The DO namespace needed by the live service
export class OrganizationDONamespace extends Context.Tag(
  "cloudflare/bindings/ORG_DO_NAMESPACE",
)<
  OrganizationDONamespace, // The service itself (though it's just holding the namespace)
  typeof env.ORG_DO // Use DurableObjectNamespace directly, let TS infer or it defaults appropriately
>() {}

// Live Implementation Layer
export const OrganizationProvisionServiceLive = Layer.effect(
  OrganizationProvisionService,
  Effect.gen(function* (_) {
    const orgDONamespace = yield* _(OrganizationDONamespace);

    return {
      initializeOrganization: (payload: OrgDOCreationPayload) =>
        Effect.tryPromise({
          try: async () => {
            // Use slug for idFromName, assuming it's unique
            const doId = orgDONamespace.idFromName(payload.slug);
            const stub = orgDONamespace.get(doId);

            console.log("initializeOrganization -> payload", payload);
            // Construct a full Request URL for DO stub.fetch
            const req = new Request("http://internal/organization", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                organization: {
                  name: payload.name,
                  slug: payload.slug,
                  logo: payload.logo,
                },
                userId: payload.creatorId,
              }),
            });
            const response = await stub.fetch(req);

            if (!response.ok) {
              let errorJson: { message?: string; errors?: unknown } = {};
              try {
                errorJson = await response.json();
              } catch (e) {
                // Ignore if response isn't JSON
              }
              throw new DOInteractionError({
                message:
                  errorJson.message ||
                  `DO request failed. Status: ${response.status}`,
                status: response.status,
                slug: payload.slug,
              });
            }
            const res = (await response.json()) as OrgCreateData;
            console.log("initializeOrganization -> res", res);
            return res;
          },
          catch: (unknownError) => {
            if (unknownError instanceof DOInteractionError) {
              return unknownError;
            }
            return new DOInteractionError({
              message: "An unexpected error occurred during DO interaction.",
              originalError: unknownError,
              slug: payload.slug,
            });
          },
        }),
    };
  }),
);
