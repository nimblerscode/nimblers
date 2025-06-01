import type { env } from "cloudflare:workers";
import { FetchHttpClient } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { UserId } from "@/domain/global/user/model";
import type { NewOrganization } from "@/domain/tenant/organization/model";
import { OrgDbError } from "@/domain/tenant/organization/model";
import { OrganizationProvisionError } from "@/domain/tenant/organization/provision/service";
import { OrganizationDOService } from "@/domain/tenant/organization/service";
import { createOrganizationDOClient } from "./organization/api/client";

// The DO namespace needed by the adapter
export class OrganizationDONamespace extends Context.Tag(
  "cloudflare/bindings/ORG_DO_NAMESPACE",
)<OrganizationDONamespace, typeof env.ORG_DO>() {}

// Layer that provides the adapter
export const OrganizationDOAdapterLive = Layer.effect(
  OrganizationDOService,
  Effect.gen(function* () {
    const orgDONamespace = yield* OrganizationDONamespace;

    const createOrganizationDO = (
      organization: NewOrganization,
      creatorId: UserId,
    ) => {
      return Effect.gen(function* () {
        yield* Effect.log("CREATE ORGANIZATION DO START").pipe(
          Effect.annotateLogs({
            organizationName: organization.name,
            slug: organization.slug,
            creatorId,
            slugType: typeof organization.slug,
            slugLength: organization.slug?.length,
            timestamp: new Date().toISOString(),
          }),
        );

        // Validate slug before creating DO
        if (!organization.slug || organization.slug.trim().length === 0) {
          return yield* Effect.fail(
            new OrganizationProvisionError({
              message: "Organization slug is required for DO creation",
              cause: new Error(`Invalid slug: ${organization.slug}`),
            }),
          );
        }

        yield* Effect.log("Creating DO ID from slug").pipe(
          Effect.annotateLogs({
            slug: organization.slug,
            method: "idFromName",
          }),
        );

        const doId = orgDONamespace.idFromName(organization.slug);

        yield* Effect.log("DO ID created successfully").pipe(
          Effect.annotateLogs({
            doIdString: doId.toString(),
            doIdName: doId.name,
            doIdHasName: !!doId.name,
            originalSlug: organization.slug,
            slugMatches: doId.name === organization.slug,
          }),
        );

        const stub = orgDONamespace.get(doId);

        yield* Effect.log("DO stub obtained, creating client");

        // Create type-safe client using TypeOnce.dev pattern
        const client = yield* createOrganizationDOClient(stub);

        yield* Effect.log("Client created, calling createOrganization");

        // Use auto-generated method with perfect type safety!
        // The client.organizations.createOrganization method is automatically generated
        // from the HttpApi definition in handlers.ts
        const org = yield* client.organizations
          .createOrganization({
            payload: {
              organization: {
                name: organization.name,
                slug: organization.slug,
                ...(organization.logo ? { logo: organization.logo } : {}),
              },
              userId: creatorId,
            },
          })
          .pipe(
            Effect.mapError((error) => {
              return new OrganizationProvisionError({
                message: `Failed to create organization: ${
                  error.message || String(error)
                }`,
                cause: error,
              });
            }),
            Effect.tapError((error) =>
              Effect.logError(
                "Error in client.organizations.createOrganization",
              ).pipe(
                Effect.annotateLogs({
                  error: error.message || String(error),
                  organizationSlug: organization.slug,
                }),
              ),
            ),
          );

        yield* Effect.log("Organization created successfully in DO").pipe(
          Effect.annotateLogs({
            orgId: org.id,
            orgSlug: org.slug,
            orgName: org.name,
          }),
        );

        return org;
      }).pipe(
        // Provide the HttpClient layer needed by the client
        Effect.provide(FetchHttpClient.layer),
      );
    };

    const getOrganizationDO = (slug: OrganizationSlug) => {
      return Effect.gen(function* () {
        const doId = orgDONamespace.idFromName(slug);
        const stub = orgDONamespace.get(doId);

        // Create type-safe client using TypeOnce.dev pattern
        const client = yield* createOrganizationDOClient(stub);

        // Use auto-generated method with perfect type safety!
        // The client.organizations.getOrganization method is automatically generated
        // from the HttpApi definition in handlers.ts
        const org = yield* client.organizations
          .getOrganization({
            path: { organizationSlug: slug },
          })
          .pipe(
            Effect.mapError((error) => {
              // Map HTTP API errors to domain errors
              return new OrgDbError({
                cause: error,
              });
            }),
          );

        return org;
      }).pipe(
        // Provide the HttpClient layer needed by the client
        Effect.provide(FetchHttpClient.layer),
      );
    };

    return {
      createOrganization: createOrganizationDO,
      getOrganization: getOrganizationDO,
    };
  }),
);

/**
 * Benefits of the TypeOnce.dev pattern here:
 *
 * BEFORE (manual client):
 * - client.createOrganization({ organization, userId })
 * - Manual error handling and type assertions
 * - Prone to client/server type mismatches
 *
 * AFTER (TypeOnce.dev pattern):
 * - client.organizations.createOrganization({ payload: { organization, userId } })
 * - Auto-generated methods with perfect type safety
 * - Impossible to have client/server mismatches
 * - Full IDE auto-complete for all parameters
 * - Automatic request/response validation
 *
 * The API definition in handlers.ts is the single source of truth! 🎯
 */
