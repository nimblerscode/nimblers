import type { env } from "cloudflare:workers";
import type { OrganizationProvisionPayload } from "@/domain/tenant/organization/provision/model";
import { OrganizationProvision } from "@/domain/tenant/organization/provision/service";
import { Headers } from "@effect/platform";
import { Context, Data, Effect, Layer } from "effect";
import type {
  NewOrganization,
  Organization,
} from "../../../domain/tenant/organization/model";
// Payload for creating/initializing an organization in the DO
// This should be compatible with what orgCreatePayload was in your action
export type OrgDOCreationPayload = NewOrganization;

// Custom error for DO interactions
export class DOInteractionError extends Data.TaggedError("DOInteractionError")<{
  readonly message: string;
  readonly status?: number;
  readonly slug?: string;
  readonly originalError?: unknown;
}> {}

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
  OrganizationProvision,
  Effect.gen(function* (_) {
    const orgDONamespace = yield* OrganizationDONamespace;

    return {
      create: ({ organization, creatorId }: OrganizationProvisionPayload) => {
        const a = Effect.gen(function* ($) {
          // 1) look up your DO stub
          const doId = orgDONamespace.idFromName(organization.slug);
          const stub = orgDONamespace.get(doId);

          // 2) call stub.fetch with (url, init) instead of new Request(...)
          const response = yield* Effect.tryPromise({
            try: async () => {
              return stub.fetch("http://internal/organization", {
                method: "POST",
                headers: Headers.unsafeFromRecord({
                  "Content-Type": "application/json",
                }),
                body: JSON.stringify({
                  organization: {
                    name: organization.name,
                    slug: organization.slug,
                    logo: organization.logo,
                  },
                  userId: creatorId,
                }),
              });
            },
            catch: (error) => {
              return new DOInteractionError({
                message: "An unexpected error occurred during DO interaction.",
                originalError: error,
              });
            },
          });

          return response;
        });
        // .pipe(Effect.provide(FetchHttpClient.layer));

        const x = Effect.tryPromise({
          try: async () => {
            // Use slug for idFromName, assuming it's unique
            const doId = orgDONamespace.idFromName(organization.slug);
            const stub = orgDONamespace.get(doId);

            console.log("initializeOrganization -> organization", organization);
            // Construct a full Request URL for DO stub.fetch
            const req = new Request("http://internal/organization", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                organization: {
                  name: organization.name,
                  slug: organization.slug,
                  logo: organization.logo,
                },
                userId: creatorId,
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
                slug: organization.slug,
              });
            }
            const res = (await response.json()) as Organization;
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
              slug: organization.slug,
            });
          },
        });

        return x;
      },
    };
  }),
);
