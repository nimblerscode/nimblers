import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  HttpApiSwagger,
  HttpServer,
} from "@effect/platform";
import { Effect, Layer, Schema } from "effect";
import { OrganizationUseCaseLive } from "@/application/tenant/organization/service.live";
import { InvitationLayerLive } from "@/config/layers";
import { InvitationUseCase } from "@/domain/tenant/invitations/service";
import { MemberRepo } from "@/domain/tenant/member/service";
import {
  ConnectedStoreRepo,
  OrganizationUseCase,
  OrgService,
} from "@/domain/tenant/organization/service";
import { ConnectedStoreRepoLive } from "@/infrastructure/persistence/tenant/sqlite/ConnectedStoreRepoLive";
import {
  DrizzleDOClientLive,
  DurableObjectState,
} from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { MemberRepoLive } from "@/infrastructure/persistence/tenant/sqlite/MemberRepoLive";
import { OrgRepoLive } from "@/infrastructure/persistence/tenant/sqlite/OrgRepoLive";
import { Tracing } from "@/tracing";
import { OrganizationApiSchemas } from "./schemas";

const idParam = HttpApiSchema.param("id", Schema.NumberFromString);

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {}
) {}

const _getOrganizations = HttpApiEndpoint.get(
  "getOrganizations",
  "/organizations"
).addSuccess(Schema.Array(OrganizationApiSchemas.getOrganization.response));

const getOrganization = HttpApiEndpoint.get(
  "getOrganization"
)`/organization/:organizationSlug`
  .addSuccess(OrganizationApiSchemas.getOrganization.response)
  .addError(HttpApiError.NotFound)
  .setPath(OrganizationApiSchemas.getOrganization.path);

const createOrganization = HttpApiEndpoint.post(
  "createOrganization",
  "/organization"
)
  .setPayload(OrganizationApiSchemas.createOrganization.request)
  .addSuccess(OrganizationApiSchemas.createOrganization.response);

const _deleteOrganization = HttpApiEndpoint.del(
  "deleteOrganization"
)`/organizations/${idParam}`;

const _updateOrganization = HttpApiEndpoint.patch(
  "updateOrganization"
)`/organizations/${idParam}`
  .setPayload(
    Schema.Struct({
      name: Schema.String,
    })
  )
  .addSuccess(OrganizationApiSchemas.getOrganization.response);

const createInvitation = HttpApiEndpoint.post(
  "createInvitation",
  "/:organizationSlug/invite"
)
  .setPath(Schema.Struct({ organizationSlug: Schema.String }))
  .setPayload(OrganizationApiSchemas.createInvitation.request)
  .addSuccess(OrganizationApiSchemas.createInvitation.response)
  .addError(HttpApiError.BadRequest);

const getInvitation = HttpApiEndpoint.get(
  "getInvitation",
  "/invitations/:organizationSlug"
)
  .setPath(OrganizationApiSchemas.getInvitation.path)
  .setUrlParams(OrganizationApiSchemas.getInvitation.urlParams)
  .addSuccess(OrganizationApiSchemas.getInvitation.response)
  .addError(HttpApiError.NotFound);

const acceptInvitation = HttpApiEndpoint.post(
  "acceptInvitation",
  "/invitations/:id/accept"
)
  .setPath(OrganizationApiSchemas.acceptInvitation.path)
  .setPayload(OrganizationApiSchemas.acceptInvitation.request)
  .addSuccess(OrganizationApiSchemas.acceptInvitation.response)
  .addError(HttpApiError.NotFound);

const getMembers = HttpApiEndpoint.get(
  "getMembers",
  "/members/:organizationSlug"
)
  .addSuccess(OrganizationApiSchemas.getMembers.response)
  .addError(HttpApiError.NotFound)
  .setPath(OrganizationApiSchemas.getMembers.path);

const getInvitations = HttpApiEndpoint.get("getInvitations", "/invitations")
  .addSuccess(OrganizationApiSchemas.getInvitations.response)
  .addError(HttpApiError.NotFound);

// Store management endpoints
const getConnectedStores = HttpApiEndpoint.get(
  "getConnectedStores",
  "/:organizationSlug/stores"
)
  .setPath(OrganizationApiSchemas.getConnectedStores.path)
  .addSuccess(OrganizationApiSchemas.getConnectedStores.response)
  .addError(HttpApiError.NotFound);

const connectStore = HttpApiEndpoint.post("connectStore", "/stores")
  .setPayload(OrganizationApiSchemas.connectStore.request)
  .addSuccess(OrganizationApiSchemas.connectStore.response)
  .addError(HttpApiError.BadRequest);

const disconnectStore = HttpApiEndpoint.del(
  "disconnectStore",
  "/stores/:shopDomain"
)
  .setPath(OrganizationApiSchemas.disconnectStore.path)
  .addSuccess(OrganizationApiSchemas.disconnectStore.response)
  .addError(HttpApiError.NotFound);

// Group all user-related endpoints
const organizationsGroup = HttpApiGroup.make("organizations")
  // .add(getOrganizations)
  .add(getOrganization)
  .add(createOrganization)
  .add(createInvitation)
  .add(getInvitation)
  .add(getInvitations)
  .add(getMembers)
  .add(acceptInvitation)
  .add(getConnectedStores)
  .add(connectStore)
  .add(disconnectStore)
  // .add(deleteOrganization)
  // .add(updateOrganization)
  .addError(Unauthorized, { status: 401 });

// Combine the groups into one API
const api = HttpApi.make("organizationApi").add(organizationsGroup);

// Export the API definition for client generation (TypeOnce.dev pattern)
export { api as organizationApi };

const organizationsGroupLive = () =>
  HttpApiBuilder.group(api, "organizations", (handlers) =>
    handlers
      .handle("getOrganization", ({ path: { organizationSlug } }) => {
        return Effect.gen(function* () {
          const repository = yield* OrgService;
          const result = yield* repository.get(organizationSlug);
          return result;
        }).pipe(
          Effect.withSpan("OrganizationDO.getOrganization", {
            attributes: {
              "organization.slug": organizationSlug,
              "api.endpoint": "/organization/:organizationSlug",
              "api.method": "GET",
            },
          }),
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
        );
      })
      .handle("createOrganization", ({ payload }) => {
        return Effect.gen(function* () {
          try {
            yield* Effect.log("=== CREATE ORGANIZATION HANDLER START ===").pipe(
              Effect.annotateLogs({
                payload: JSON.stringify(payload, null, 2),
                timestamp: new Date().toISOString(),
              })
            );

            yield* Effect.log(
              "Attempting to get OrganizationUseCase dependency"
            );
            const organizationUseCase = yield* OrganizationUseCase;
            yield* Effect.log("OrganizationUseCase obtained successfully").pipe(
              Effect.annotateLogs({
                useCaseType: typeof organizationUseCase,
                availableMethods: Object.keys(organizationUseCase),
              })
            );

            yield* Effect.log("Calling organizationUseCase.createOrg").pipe(
              Effect.annotateLogs({
                organization: JSON.stringify(payload.organization, null, 2),
                userId: payload.userId,
              })
            );

            const result = yield* organizationUseCase.createOrg(
              payload.organization,
              payload.userId
            );

            yield* Effect.log("Organization created successfully").pipe(
              Effect.annotateLogs({
                result: JSON.stringify(result, null, 2),
                timestamp: new Date().toISOString(),
              })
            );

            // The use case returns { org: Organization, memberCreateData: {} }
            // We need to return just the org part, properly formatted
            const organization = result.org;

            yield* Effect.log(
              "=== CREATE ORGANIZATION HANDLER SUCCESS ==="
            ).pipe(
              Effect.annotateLogs({
                resultOrg: JSON.stringify(organization, null, 2),
              })
            );

            // Ensure the organization object matches OrganizationSchema
            const formattedOrganization = {
              id: organization.id,
              name: organization.name,
              slug: organization.slug,
              logo: organization.logo || null,
              metadata: organization.metadata || null,
              createdAt: organization.createdAt,
            };

            yield* Effect.log("Formatted organization for response").pipe(
              Effect.annotateLogs({
                formattedOrganization: JSON.stringify(
                  formattedOrganization,
                  null,
                  2
                ),
              })
            );

            return formattedOrganization;
          } catch (error) {
            yield* Effect.logError(
              "=== SYNC ERROR IN CREATE ORGANIZATION HANDLER ==="
            ).pipe(
              Effect.annotateLogs({
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                errorType: typeof error,
                timestamp: new Date().toISOString(),
              })
            );
            throw error;
          }
        }).pipe(
          Effect.withSpan("OrganizationDO.createOrganization", {
            attributes: {
              "organization.name": payload.organization.name,
              "organization.slug": payload.organization.slug,
              "user.id": payload.userId,
              "api.endpoint": "/organization",
              "api.method": "POST",
            },
          }),
          Effect.mapError((error) => {
            Effect.runSync(
              Effect.logError(
                "=== EFFECT ERROR IN CREATE ORGANIZATION HANDLER ==="
              ).pipe(
                Effect.annotateLogs({
                  error: error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : undefined,
                  errorType: typeof error,
                  timestamp: new Date().toISOString(),
                })
              )
            );
            return new HttpApiError.HttpApiDecodeError({
              message: error.message || String(error),
              issues: [],
            });
          })
        );
      })
      .handle("createInvitation", ({ path: { organizationSlug }, payload }) => {
        return Effect.gen(function* () {
          const invitationService = yield* InvitationUseCase;
          const invitation = yield* invitationService.create(
            payload.newInvitation
          );

          return { invitation };
        }).pipe(
          Effect.withSpan("OrganizationDO.createInvitation", {
            attributes: {
              "organization.slug": organizationSlug,
              "invitation.email": payload.newInvitation.inviteeEmail,
              "invitation.role": payload.newInvitation.role,
              "api.endpoint": "/:organizationSlug/invite",
              "api.method": "POST",
            },
          }),
          Effect.mapError((error) => {
            return new HttpApiError.HttpApiDecodeError({
              message: error.message || String(error),
              issues: [],
            });
          })
        );
      })
      .handle("getInvitation", ({ path: { organizationSlug } }) => {
        const url = new URL("http://temp.com");
        const token = url.searchParams.get("token");
        return Effect.gen(function* () {
          if (!token) {
            return yield* Effect.fail(
              new HttpApiError.HttpApiDecodeError({
                message: "Token is required",
                issues: [],
              })
            );
          }
          const invitationService = yield* InvitationUseCase;
          const invitation = yield* invitationService.get(token);
          return invitation;
        }).pipe(
          Effect.withSpan("OrganizationDO.getInvitation", {
            attributes: {
              "organization.slug": organizationSlug,
              "invitation.token.present": !!token,
              "api.endpoint": "/invitations/:organizationSlug",
              "api.method": "GET",
            },
          }),
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
        );
      })
      .handle("getMembers", ({ path: { organizationSlug } }) => {
        return Effect.gen(function* () {
          const memberRepo = yield* MemberRepo;
          const members = yield* memberRepo.getMembers;
          return members;
        }).pipe(
          Effect.withSpan("OrganizationDO.getMembers", {
            attributes: {
              "organization.slug": organizationSlug,
              "api.endpoint": "/members/:organizationSlug",
              "api.method": "GET",
            },
          }),
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
        );
      })
      .handle("getInvitations", () => {
        return Effect.gen(function* () {
          const invitationService = yield* InvitationUseCase;
          return yield* invitationService.list().pipe(
            Effect.map((invitations) => invitations),
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message: error.message || String(error),
                  issues: [],
                })
            )
          );
        }).pipe(
          Effect.withSpan("OrganizationDO.getInvitations", {
            attributes: {
              "api.endpoint": "/invitations",
              "api.method": "GET",
            },
          })
        );
      })
      .handle(
        "acceptInvitation",
        ({ path: { id }, payload: { token, userId } }) => {
          return Effect.gen(function* () {
            try {
              const invitationService = yield* InvitationUseCase;
              const result = yield* invitationService
                .accept(token, userId)
                .pipe(
                  Effect.tap(() => {}),
                  Effect.map(() => {
                    return { ok: true };
                  }),
                  Effect.mapError((error) => {
                    return new HttpApiError.HttpApiDecodeError({
                      message: error.message || String(error),
                      issues: [
                        {
                          _tag: "Type",
                          message: error.message || String(error),
                          path: [],
                        },
                      ],
                    });
                  }),
                  Effect.tap(() => {})
                );

              return result;
            } catch (syncError) {
              return yield* Effect.fail(
                new HttpApiError.HttpApiDecodeError({
                  message: `Synchronous error: ${
                    (syncError as any)?.message || String(syncError)
                  }`,
                  issues: [
                    {
                      _tag: "Type",
                      message: `Synchronous error: ${
                        (syncError as any)?.message || String(syncError)
                      }`,
                      path: [],
                    },
                  ],
                })
              );
            }
          }).pipe(
            Effect.withSpan("OrganizationDO.acceptInvitation", {
              attributes: {
                "invitation.id": id,
                "invitation.token.present": !!token,
                "user.id": userId,
                "api.endpoint": "/invitations/:id/accept",
                "api.method": "POST",
              },
            })
          );
        }
      )
      .handle("getConnectedStores", ({ path: { organizationSlug } }) => {
        return Effect.gen(function* () {
          const repository = yield* OrgService;
          const connectedStoreRepo = yield* ConnectedStoreRepo;
          const org = yield* repository
            .get(organizationSlug)
            .pipe(
              Effect.mapError(
                (error) =>
                  new Error(
                    `Failed to get organization '${organizationSlug}': ${
                      error.message || String(error)
                    }`
                  )
              )
            );

          const stores = yield* connectedStoreRepo
            .getByOrganizationId(org.id)
            .pipe(
              Effect.mapError(
                (error) =>
                  new Error(
                    `Failed to get stores for org '${org.id}' (${org.name}): ${
                      error.message || String(error)
                    }`
                  )
              )
            );

          return stores;
        }).pipe(
          Effect.withSpan("OrganizationDO.getConnectedStores", {
            attributes: {
              "organization.slug": organizationSlug,
              "api.endpoint": "/:organizationSlug/stores",
              "api.method": "GET",
            },
          }),
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
        );
      })
      .handle("connectStore", ({ payload }) => {
        return Effect.gen(function* () {
          const repository = yield* OrgService;
          const connectedStoreRepo = yield* ConnectedStoreRepo;
          const orgSlugFromPayload = payload.organizationSlug;

          // Get the organization from DO database - it should already exist
          const org = yield* repository.get(orgSlugFromPayload).pipe(
            Effect.mapError(
              (_error) =>
                new HttpApiError.HttpApiDecodeError({
                  message: `Organization '${orgSlugFromPayload}' not found. The organization must exist before connecting stores.`,
                  issues: [],
                })
            )
          );

          // Verify org exists before proceeding
          if (!org || !org.id) {
            return yield* Effect.fail(
              new HttpApiError.HttpApiDecodeError({
                message: `Organization '${orgSlugFromPayload}' not found`,
                issues: [],
              })
            );
          }

          // Check if the shop is already connected to this organization (local check)
          const existingStore = yield* connectedStoreRepo.getByShopDomain(
            payload.shopDomain
          );

          if (existingStore && existingStore.organizationId !== org.id) {
            return yield* Effect.fail(
              new HttpApiError.HttpApiDecodeError({
                message: `Shop '${payload.shopDomain}' is already connected to another organization. Each Shopify store can only be connected to one organization at a time. Please disconnect from the current organization before connecting to '${orgSlugFromPayload}'.`,
                issues: [],
              })
            );
          }

          const newStore = {
            organizationId: org.id,
            type: payload.type,
            shopDomain: payload.shopDomain,
            scope: null, // Will be populated during OAuth flow
            status: "active" as const,
            connectedAt: new Date(),
            lastSyncAt: null,
            metadata: null, // Will be populated during OAuth flow
          };

          // Use upsert instead of create to handle updates for the same org
          const store = yield* connectedStoreRepo.upsert(newStore);

          return {
            id: store.id,
            shopDomain: store.shopDomain,
            status: store.status,
          };
        }).pipe(
          Effect.withSpan("OrganizationDO.connectStore", {
            attributes: {
              "organization.slug": payload.organizationSlug,
              "store.shopDomain": payload.shopDomain,
              "store.type": payload.type,
              "api.endpoint": "/stores",
              "api.method": "POST",
            },
          }),
          Effect.mapError((error) => {
            if (error instanceof Error) {
              return new HttpApiError.HttpApiDecodeError({
                message: `Shop '${payload.shopDomain}' is already connected to another organization. Each Shopify store can only be connected to one organization at a time.`,
                issues: [],
              });
            }

            return new HttpApiError.HttpApiDecodeError({
              message: `Failed to connect store: ${
                error.message || String(error)
              }`,
              issues: [],
            });
          })
        );
      })
      .handle("disconnectStore", ({ path: { shopDomain } }) => {
        return Effect.gen(function* () {
          const connectedStoreRepo = yield* ConnectedStoreRepo;

          const store = yield* connectedStoreRepo.getByShopDomain(shopDomain);
          if (store) {
            yield* connectedStoreRepo.delete(store.id);
          }

          return { success: true };
        }).pipe(
          Effect.withSpan("OrganizationDO.disconnectStore", {
            attributes: {
              "store.shopDomain": shopDomain,
              "api.endpoint": "/stores/:shopDomain",
              "api.method": "DELETE",
            },
          }),
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
        );
      })
  );

export function getOrgHandler(
  doState: DurableObjectState,
  organizationSlug: string
) {
  // Use the provided organization slug instead of relying on doState.id.name
  if (!organizationSlug || organizationSlug.trim().length === 0) {
    const errorMessage = `Organization slug parameter is required but was empty or undefined. Provided slug: "${organizationSlug}"`;
    throw new Error(errorMessage);
  }
  const MemberServiceLayer = Layer.provide(MemberRepoLive, DrizzleDOClientLive);
  const OrgServiceLayer = Layer.provide(
    OrgRepoLive,
    Layer.merge(DrizzleDOClientLive, MemberServiceLayer)
  );
  const ConnectedStoreLayer = Layer.provide(
    ConnectedStoreRepoLive,
    DrizzleDOClientLive
  );
  const OrganizationUseCaseLayer = Layer.provide(
    OrganizationUseCaseLive,
    Layer.merge(OrgServiceLayer, ConnectedStoreLayer)
  );
  const DORepoLayer = Layer.succeed(DurableObjectState, doState);

  // Create a DurableObjectId with the correct organization slug name
  const organizationDoId: DurableObjectId = {
    ...doState.id,
    name: organizationSlug,
  };

  const InvitationRepoLayer = Layer.provide(
    InvitationLayerLive(organizationDoId),
    DORepoLayer
  );
  const finalLayer = Layer.provide(
    Layer.mergeAll(
      OrgServiceLayer,
      InvitationRepoLayer,
      MemberServiceLayer,
      ConnectedStoreLayer,
      OrganizationUseCaseLayer
    ),
    DORepoLayer
  );
  // Organizations group layer with all dependencies
  const organizationsGroupLayerLive = Layer.provide(
    organizationsGroupLive(), // Pass the organization slug
    finalLayer
  );
  // API layer with Swagger
  const OrganizationApiLive = HttpApiBuilder.api(api).pipe(
    Layer.provide(organizationsGroupLayerLive)
  );
  const SwaggerLayer = HttpApiSwagger.layer().pipe(
    Layer.provide(OrganizationApiLive)
  );
  // Final handler with all layers merged, including tracing
  const { dispose, handler } = HttpApiBuilder.toWebHandler(
    Layer.mergeAll(
      OrganizationApiLive,
      SwaggerLayer,
      HttpServer.layerContext,
      Tracing
    )
  );

  return { dispose, handler };
}
