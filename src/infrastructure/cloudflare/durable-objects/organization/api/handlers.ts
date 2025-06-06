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
import { InvitationLayerLive, CustomerLayerLive } from "@/config/layers";
import { InvitationUseCase } from "@/domain/tenant/invitations/service";
import { MemberRepo } from "@/domain/tenant/member/service";
import {
  ConnectedStoreRepo,
  OrganizationUseCase,
  OrgService,
} from "@/domain/tenant/organization/service";
import { CampaignUseCase } from "@/domain/tenant/campaigns/service";
import { SegmentUseCase } from "@/domain/tenant/segments/service";
import { CustomerUseCase } from "@/domain/tenant/customers/service";
import { SegmentCustomerUseCase } from "@/domain/tenant/segment-customers/service";
import { ConnectedStoreRepoLive } from "@/infrastructure/persistence/tenant/sqlite/ConnectedStoreRepoLive";
import {
  DrizzleDOClientLive,
  DurableObjectState,
} from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { MemberRepoLive } from "@/infrastructure/persistence/tenant/sqlite/MemberRepoLive";
import { OrgRepoLive } from "@/infrastructure/persistence/tenant/sqlite/OrgRepoLive";
import {
  CampaignLayerLive,
  SegmentLayerLive,
  SegmentCustomerLayerLive,
} from "@/config/layers";
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

// Campaign endpoints
const createCampaign = HttpApiEndpoint.post("createCampaign", "/campaigns")
  .setPayload(OrganizationApiSchemas.createCampaign.request)
  .addSuccess(OrganizationApiSchemas.createCampaign.response)
  .addError(HttpApiError.BadRequest);

const listCampaigns = HttpApiEndpoint.get("listCampaigns", "/campaigns")
  .addSuccess(OrganizationApiSchemas.listCampaigns.response)
  .addError(HttpApiError.NotFound);

// Segment endpoints
const createSegment = HttpApiEndpoint.post("createSegment", "/segments")
  .setPayload(OrganizationApiSchemas.createSegment.request)
  .addSuccess(OrganizationApiSchemas.createSegment.response)
  .addError(HttpApiError.BadRequest);

const listSegments = HttpApiEndpoint.get("listSegments", "/segments")
  .addSuccess(OrganizationApiSchemas.listSegments.response)
  .addError(HttpApiError.NotFound);

const getSegment = HttpApiEndpoint.get("getSegment", "/segments/:segmentId")
  .setPath(OrganizationApiSchemas.getSegment.path)
  .addSuccess(OrganizationApiSchemas.getSegment.response)
  .addError(HttpApiError.NotFound);

// Customer endpoints
const createCustomer = HttpApiEndpoint.post("createCustomer", "/customers")
  .setPayload(OrganizationApiSchemas.createCustomer.request)
  .addSuccess(OrganizationApiSchemas.createCustomer.response)
  .addError(HttpApiError.BadRequest);

const listCustomers = HttpApiEndpoint.get("listCustomers", "/customers")
  .setUrlParams(OrganizationApiSchemas.listCustomers.urlParams)
  .addSuccess(OrganizationApiSchemas.listCustomers.response)
  .addError(HttpApiError.NotFound);

const getCustomer = HttpApiEndpoint.get("getCustomer", "/customers/:customerId")
  .setPath(OrganizationApiSchemas.getCustomer.path)
  .addSuccess(OrganizationApiSchemas.getCustomer.response)
  .addError(HttpApiError.NotFound);

const updateCustomer = HttpApiEndpoint.patch(
  "updateCustomer",
  "/customers/:customerId"
)
  .setPath(OrganizationApiSchemas.updateCustomer.path)
  .setPayload(OrganizationApiSchemas.updateCustomer.request)
  .addSuccess(OrganizationApiSchemas.updateCustomer.response)
  .addError(HttpApiError.NotFound);

const deleteCustomer = HttpApiEndpoint.del(
  "deleteCustomer",
  "/customers/:customerId"
)
  .setPath(OrganizationApiSchemas.deleteCustomer.path)
  .addSuccess(OrganizationApiSchemas.deleteCustomer.response)
  .addError(HttpApiError.NotFound);

const searchCustomers = HttpApiEndpoint.get(
  "searchCustomers",
  "/customers/search"
)
  .setUrlParams(OrganizationApiSchemas.searchCustomers.urlParams)
  .addSuccess(OrganizationApiSchemas.searchCustomers.response)
  .addError(HttpApiError.NotFound);

// Segment-Customer endpoints
const addCustomersToSegment = HttpApiEndpoint.post(
  "addCustomersToSegment",
  "/segments/customers/add"
)
  .setPayload(OrganizationApiSchemas.addCustomersToSegment.request)
  .addSuccess(OrganizationApiSchemas.addCustomersToSegment.response)
  .addError(HttpApiError.BadRequest);

const removeCustomersFromSegment = HttpApiEndpoint.post(
  "removeCustomersFromSegment",
  "/segments/customers/remove"
)
  .setPayload(OrganizationApiSchemas.removeCustomersFromSegment.request)
  .addSuccess(OrganizationApiSchemas.removeCustomersFromSegment.response)
  .addError(HttpApiError.BadRequest);

const listSegmentCustomers = HttpApiEndpoint.get(
  "listSegmentCustomers",
  "/segments/:segmentId/customers"
)
  .setPath(OrganizationApiSchemas.listSegmentCustomers.path)
  .setUrlParams(OrganizationApiSchemas.listSegmentCustomers.urlParams)
  .addSuccess(OrganizationApiSchemas.listSegmentCustomers.response)
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
  .add(createCampaign)
  .add(listCampaigns)
  .add(createSegment)
  .add(listSegments)
  .add(getSegment)
  .add(createCustomer)
  .add(listCustomers)
  .add(getCustomer)
  .add(updateCustomer)
  .add(deleteCustomer)
  .add(searchCustomers)
  .add(addCustomersToSegment)
  .add(removeCustomersFromSegment)
  .add(listSegmentCustomers)
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
      .handle("createCampaign", ({ payload }) => {
        return Effect.gen(function* () {
          const campaignService = yield* CampaignUseCase;
          const campaign = yield* campaignService.createCampaign(payload);
          return campaign;
        }).pipe(
          Effect.withSpan("OrganizationDO.createCampaign", {
            attributes: {
              "campaign.name": payload.name,
              "campaign.type": payload.campaignType,
              "api.endpoint": "/campaigns",
              "api.method": "POST",
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
      .handle("listCampaigns", () => {
        return Effect.gen(function* () {
          const campaignService = yield* CampaignUseCase;
          const result = yield* campaignService.listCampaigns();
          return result;
        }).pipe(
          Effect.withSpan("OrganizationDO.listCampaigns", {
            attributes: {
              "api.endpoint": "/campaigns",
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
      .handle("createSegment", ({ payload }) => {
        return Effect.gen(function* () {
          const segmentService = yield* SegmentUseCase;
          const segment = yield* segmentService.createSegment(payload);
          return segment;
        }).pipe(
          Effect.withSpan("OrganizationDO.createSegment", {
            attributes: {
              "segment.name": payload.name,
              "segment.type": payload.type,
              "api.endpoint": "/segments",
              "api.method": "POST",
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
      .handle("listSegments", () => {
        return Effect.gen(function* () {
          const segmentService = yield* SegmentUseCase;
          const segmentCustomerService = yield* SegmentCustomerUseCase;
          const result = yield* segmentService.listSegments();

          // Add customer counts to each segment
          const segmentsWithCounts = yield* Effect.all(
            result.segments.map((segment) =>
              Effect.gen(function* () {
                const customerCount =
                  yield* segmentCustomerService.getSegmentCustomerCount(
                    segment.id
                  );
                return {
                  ...segment,
                  customerCount,
                };
              })
            )
          );

          return {
            ...result,
            segments: segmentsWithCounts,
          };
        }).pipe(
          Effect.withSpan("OrganizationDO.listSegments", {
            attributes: {
              "api.endpoint": "/segments",
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
      .handle("getSegment", ({ path: { segmentId } }) => {
        return Effect.gen(function* () {
          const segmentService = yield* SegmentUseCase;
          const segmentCustomerService = yield* SegmentCustomerUseCase;
          const segment = yield* segmentService.getSegment(segmentId);

          // Add customer count to the segment
          const customerCount =
            yield* segmentCustomerService.getSegmentCustomerCount(segmentId);

          return {
            ...segment,
            customerCount,
          };
        }).pipe(
          Effect.withSpan("OrganizationDO.getSegment", {
            attributes: {
              "segment.id": segmentId,
              "api.endpoint": "/segments/:segmentId",
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
      .handle("createCustomer", ({ payload }) => {
        return Effect.gen(function* () {
          const customerService = yield* CustomerUseCase;
          const customer = yield* customerService.createCustomer(payload);
          return customer;
        }).pipe(
          Effect.withSpan("OrganizationDO.createCustomer", {
            attributes: {
              "customer.email": payload.email,
              "api.endpoint": "/customers",
              "api.method": "POST",
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
      .handle("listCustomers", ({ urlParams }) => {
        return Effect.gen(function* () {
          const customerService = yield* CustomerUseCase;
          const customers = yield* customerService.listCustomers({
            limit: urlParams.limit,
            offset: urlParams.offset,
            status: urlParams.status,
          });
          const total = yield* customerService.getCustomerCount();

          const limit = urlParams.limit || 50;
          const offset = urlParams.offset || 0;
          const hasMore = offset + customers.length < total;

          return {
            customers,
            hasMore,
            total,
          };
        }).pipe(
          Effect.withSpan("OrganizationDO.listCustomers", {
            attributes: {
              "api.endpoint": "/customers",
              "api.method": "GET",
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
      .handle("getCustomer", ({ path: { customerId } }) => {
        return Effect.gen(function* () {
          const customerService = yield* CustomerUseCase;
          const customer = yield* customerService.getCustomer(customerId);
          return customer;
        }).pipe(
          Effect.withSpan("OrganizationDO.getCustomer", {
            attributes: {
              "customer.id": customerId,
              "api.endpoint": "/customers/:customerId",
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
      .handle("updateCustomer", ({ path: { customerId }, payload }) => {
        return Effect.gen(function* () {
          const customerService = yield* CustomerUseCase;
          const customer = yield* customerService.updateCustomer(
            customerId,
            payload
          );
          return customer;
        }).pipe(
          Effect.withSpan("OrganizationDO.updateCustomer", {
            attributes: {
              "customer.id": customerId,
              "api.endpoint": "/customers/:customerId",
              "api.method": "PATCH",
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
      .handle("deleteCustomer", ({ path: { customerId } }) => {
        return Effect.gen(function* () {
          const customerService = yield* CustomerUseCase;
          yield* customerService.deleteCustomer(customerId);
          return { success: true };
        }).pipe(
          Effect.withSpan("OrganizationDO.deleteCustomer", {
            attributes: {
              "customer.id": customerId,
              "api.endpoint": "/customers/:customerId",
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
      .handle("searchCustomers", ({ urlParams }) => {
        return Effect.gen(function* () {
          const customerService = yield* CustomerUseCase;
          const customers = yield* customerService.searchCustomers({
            query: urlParams.query,
            tags: urlParams.tags ? urlParams.tags.split(",") : undefined,
            status: urlParams.status,
            limit: urlParams.limit,
            offset: urlParams.offset,
          });
          const total = yield* customerService.getCustomerCount();

          const limit = urlParams.limit || 50;
          const offset = urlParams.offset || 0;
          const hasMore = offset + customers.length < total;

          return {
            customers,
            hasMore,
            total,
          };
        }).pipe(
          Effect.withSpan("OrganizationDO.searchCustomers", {
            attributes: {
              "search.query": urlParams.query,
              "api.endpoint": "/customers/search",
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
      .handle("addCustomersToSegment", ({ payload }) => {
        return Effect.gen(function* () {
          const segmentCustomerService = yield* SegmentCustomerUseCase;
          const results =
            yield* segmentCustomerService.bulkAddCustomersToSegment(
              payload.segmentId,
              Array.from(payload.customerIds),
              undefined, // addedBy - can be set to current user if needed
              payload.source || "manual"
            );
          return {
            success: true,
            message: `Successfully added ${results.length} customers to segment`,
            addedCount: results.length,
          };
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
      .handle("removeCustomersFromSegment", ({ payload }) => {
        return Effect.gen(function* () {
          const segmentCustomerService = yield* SegmentCustomerUseCase;
          yield* segmentCustomerService.bulkRemoveCustomersFromSegment(
            payload.segmentId,
            Array.from(payload.customerIds)
          );
          return {
            success: true,
            message: `Successfully removed ${payload.customerIds.length} customers from segment`,
            removedCount: payload.customerIds.length,
          };
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
      .handle("listSegmentCustomers", ({ path, urlParams }) => {
        return Effect.gen(function* () {
          const segmentCustomerService = yield* SegmentCustomerUseCase;
          const customerService = yield* CustomerUseCase;

          // Get segment-customer relationships
          const segmentCustomers =
            yield* segmentCustomerService.listSegmentCustomers({
              segmentId: path.segmentId,
              limit: urlParams.limit,
              offset: urlParams.offset,
            });

          // Get full customer data for each relationship
          const customers = yield* Effect.all(
            segmentCustomers.map((segmentCustomer) =>
              customerService.getCustomer(segmentCustomer.customerId)
            )
          );

          // Get total count for pagination
          const totalCount =
            yield* segmentCustomerService.getSegmentCustomerCount(
              path.segmentId
            );

          const limit = urlParams.limit || 50;
          const offset = urlParams.offset || 0;
          const hasMore = offset + customers.length < totalCount;

          return {
            customers,
            hasMore,
            totalCount,
          };
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
  const CampaignLayer = Layer.provide(CampaignLayerLive(), DrizzleDOClientLive);
  const SegmentLayer = Layer.provide(
    SegmentLayerLive(organizationDoId),
    DrizzleDOClientLive
  );
  const CustomerLayer = Layer.provide(CustomerLayerLive(), DrizzleDOClientLive);
  const SegmentCustomerLayer = Layer.provide(
    SegmentCustomerLayerLive(organizationDoId),
    DrizzleDOClientLive
  );
  const finalLayer = Layer.provide(
    Layer.mergeAll(
      OrgServiceLayer,
      InvitationRepoLayer,
      MemberServiceLayer,
      ConnectedStoreLayer,
      OrganizationUseCaseLayer,
      CampaignLayer,
      SegmentLayer,
      CustomerLayer,
      SegmentCustomerLayer
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
