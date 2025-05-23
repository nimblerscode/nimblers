import type { env } from "cloudflare:workers";
import { Headers } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { UserId } from "@/domain/global/user/model";
import type {
  NewOrganization,
  Organization,
} from "@/domain/tenant/organization/model";
import { OrganizationProvisionError } from "@/domain/tenant/organization/provision/service";
import { OrganizationDOService } from "@/domain/tenant/organization/service";

// The DO namespace needed by the adapter
export class OrganizationDONamespace extends Context.Tag(
  "cloudflare/bindings/ORG_DO_NAMESPACE"
)<OrganizationDONamespace, typeof env.ORG_DO>() {}

// Layer that provides the adapter
export const OrganizationDOAdapterLive = Layer.effect(
  OrganizationDOService,
  Effect.gen(function* () {
    const orgDONamespace = yield* OrganizationDONamespace;

    const createOrganizationDO = (
      organization: NewOrganization,
      creatorId: UserId
    ) => {
      return Effect.gen(function* () {
        // Create the organization in the Durable Object
        const doId = orgDONamespace.idFromName(organization.slug);
        const stub = orgDONamespace.get(doId);

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
            throw new OrganizationProvisionError({
              message: error instanceof Error ? error.message : String(error),
              cause: error,
            });
          },
        });

        if (!response.ok) {
          throw new OrganizationProvisionError({
            message: "An unexpected error occurred during DO interaction.",
            cause: response,
          });
        }

        const org = yield* Effect.tryPromise({
          try: async () => {
            return response.json() as unknown as Organization;
          },
          catch: (error) => {
            throw new OrganizationProvisionError({
              message: "An unexpected error occurred during DO interaction.",
              cause: error,
            });
          },
        });

        return org;
      });
    };

    const getOrganizationDO = (slug: string) => {
      return Effect.gen(function* () {
        const doId = orgDONamespace.idFromName(slug);
        const stub = orgDONamespace.get(doId);
        const response = yield* Effect.tryPromise({
          try: async () => {
            return stub.fetch(`http://internal/organization/${slug}`, {
              method: "GET",
            });
          },
          catch: (error) => {
            throw new OrganizationProvisionError({
              message: "An unexpected error occurred during DO interaction.",
              cause: error,
            });
          },
        });

        if (!response.ok) {
          throw new OrganizationProvisionError({
            message: "An unexpected error occurred during DO interaction.",
            cause: response,
          });
        }

        const org = yield* Effect.tryPromise({
          try: async () => {
            return response.json() as unknown as Organization;
          },
          catch: (error) => {
            throw new OrganizationProvisionError({
              message: "An unexpected error occurred during DO interaction.",
              cause: error,
            });
          },
        });

        return org;
      });
    };

    return {
      createOrganization: createOrganizationDO,
      getOrganization: getOrganizationDO,
    };
  })
);
