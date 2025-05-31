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

const createInvitation = HttpApiEndpoint.post("createInvitation", "/invite")
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
const getConnectedStores = HttpApiEndpoint.get("getConnectedStores", "/stores")
  .addSuccess(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        organizationId: Schema.String,
        type: Schema.Literal("shopify"),
        shopDomain: Schema.String,
        scope: Schema.NullOr(Schema.String),
        status: Schema.Union(
          Schema.Literal("active"),
          Schema.Literal("disconnected"),
          Schema.Literal("error")
        ),
        connectedAt: Schema.Date,
        lastSyncAt: Schema.NullOr(Schema.Date),
        metadata: Schema.NullOr(Schema.String),
        createdAt: Schema.Date,
      })
    )
  )
  .addError(HttpApiError.NotFound);

const connectStore = HttpApiEndpoint.post("connectStore", "/stores")
  .setPayload(
    Schema.Struct({
      type: Schema.Literal("shopify"),
      shopDomain: Schema.String,
      scope: Schema.String,
      accessToken: Schema.String,
      organizationSlug: Schema.String,
    })
  )
  .addSuccess(
    Schema.Struct({
      id: Schema.String,
      shopDomain: Schema.String,
      status: Schema.String,
    })
  )
  .addError(HttpApiError.BadRequest);

const disconnectStore = HttpApiEndpoint.del(
  "disconnectStore",
  "/stores/:shopDomain"
)
  .setPath(
    Schema.Struct({
      shopDomain: Schema.String,
    })
  )
  .addSuccess(
    Schema.Struct({
      success: Schema.Boolean,
    })
  )
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

const organizationsGroupLive = (organizationSlug: string) =>
  HttpApiBuilder.group(api, "organizations", (handlers) =>
    handlers
      .handle("getOrganization", ({ path: { organizationSlug } }) => {
        return Effect.gen(function* () {
          const repository = yield* OrgService;
          const result = yield* repository.get(organizationSlug);
          return result;
        }).pipe(
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
            yield* Effect.log("createOrganization handler started").pipe(
              Effect.annotateLogs({ payload })
            );

            const organizationUseCase = yield* OrganizationUseCase;
            yield* Effect.log("OrganizationUseCase obtained successfully");

            const result = yield* organizationUseCase.createOrg(
              payload.organization,
              payload.userId
            );
            yield* Effect.log("Organization created successfully").pipe(
              Effect.annotateLogs({ result })
            );

            return result.org;
          } catch (error) {
            yield* Effect.logError(
              "Sync error in createOrganization handler"
            ).pipe(Effect.annotateLogs({ error }));
            throw error;
          }
        }).pipe(
          Effect.mapError((error) => {
            Effect.runSync(
              Effect.logError(
                "Effect error in createOrganization handler"
              ).pipe(Effect.annotateLogs({ error }))
            );
            return new HttpApiError.HttpApiDecodeError({
              message: error.message || String(error),
              issues: [],
            });
          })
        );
      })
      .handle("createInvitation", ({ payload }) => {
        return Effect.gen(function* () {
          const invitationService = yield* InvitationUseCase;
          const invitation = yield* invitationService.create(
            payload.newInvitation
          );
          return { invitation };
        }).pipe(
          Effect.mapError(
            (error) =>
              new HttpApiError.HttpApiDecodeError({
                message: error.message || String(error),
                issues: [],
              })
          )
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
        });
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
          });
        }
      )
      .handle("getConnectedStores", () => {
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
              (error) =>
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
            scope: payload.scope,
            status: "active" as const,
            connectedAt: new Date(),
            lastSyncAt: null,
            metadata: JSON.stringify({ accessToken: payload.accessToken }),
          };

          // Use upsert instead of create to handle updates for the same org
          const store = yield* connectedStoreRepo.upsert(newStore);

          return {
            id: store.id,
            shopDomain: store.shopDomain,
            status: store.status,
          };
        }).pipe(
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

export function getOrgHandler(doState: DurableObjectState) {
  // Extract organization slug from Durable Object ID
  // Use .name to get the original name used with idFromName(), fallback to toString()
  const organizationSlug = doState.id.name || doState.id.toString();

  // Member repository layer
  const MemberServiceLayer = Layer.provide(MemberRepoLive, DrizzleDOClientLive);

  // Organization repository layer
  const OrgServiceLayer = Layer.provide(
    OrgRepoLive,
    Layer.merge(DrizzleDOClientLive, MemberServiceLayer)
  );

  // Connected Store repository layer
  const ConnectedStoreLayer = Layer.provide(
    ConnectedStoreRepoLive,
    DrizzleDOClientLive
  );

  // Organization Use Case layer
  const OrganizationUseCaseLayer = Layer.provide(
    OrganizationUseCaseLive,
    Layer.merge(OrgServiceLayer, ConnectedStoreLayer)
  );

  const DORepoLayer = Layer.succeed(DurableObjectState, doState);

  const InvitationRepoLayer = Layer.provide(
    InvitationLayerLive(doState.id),
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
    organizationsGroupLive(organizationSlug), // Pass the organization slug
    finalLayer
  );

  // API layer with Swagger
  const OrganizationApiLive = HttpApiBuilder.api(api).pipe(
    Layer.provide(organizationsGroupLayerLive)
  );

  const SwaggerLayer = HttpApiSwagger.layer().pipe(
    Layer.provide(OrganizationApiLive)
  );

  // Final handler with all layers merged
  const { dispose, handler } = HttpApiBuilder.toWebHandler(
    Layer.mergeAll(OrganizationApiLive, SwaggerLayer, HttpServer.layerContext)
  );

  // Wrap handler with additional error logging
  const wrappedHandler = async (request: Request): Promise<Response> => {
    const response = await handler(request);
    return response;
  };

  return { dispose, handler: wrappedHandler };
}
