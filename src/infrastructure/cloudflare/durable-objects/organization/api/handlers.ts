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
import { InvitationLayerLive } from "@/config/layers";
import { InvitationUseCase } from "@/domain/tenant/invitations/service";
import { MemberRepo } from "@/domain/tenant/member/service";
import { OrgService } from "@/domain/tenant/organization/service";
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
  {},
) {}

const _getOrganizations = HttpApiEndpoint.get(
  "getOrganizations",
  "/organizations",
).addSuccess(Schema.Array(OrganizationApiSchemas.getOrganization.response));

const getOrganization = HttpApiEndpoint.get(
  "getOrganization",
)`/organization/:organizationSlug`
  .addSuccess(OrganizationApiSchemas.getOrganization.response)
  .addError(HttpApiError.NotFound)
  .setPath(OrganizationApiSchemas.getOrganization.path);

const createOrganization = HttpApiEndpoint.post(
  "createOrganization",
  "/organization",
)
  .setPayload(OrganizationApiSchemas.createOrganization.request)
  .addSuccess(OrganizationApiSchemas.createOrganization.response);

const _deleteOrganization = HttpApiEndpoint.del(
  "deleteOrganization",
)`/organizations/${idParam}`;

const _updateOrganization = HttpApiEndpoint.patch(
  "updateOrganization",
)`/organizations/${idParam}`
  .setPayload(
    Schema.Struct({
      name: Schema.String,
    }),
  )
  .addSuccess(OrganizationApiSchemas.getOrganization.response);

const createInvitation = HttpApiEndpoint.post("createInvitation", "/invite")
  .setPayload(OrganizationApiSchemas.createInvitation.request)
  .addSuccess(OrganizationApiSchemas.createInvitation.response)
  .addError(HttpApiError.BadRequest);

const getInvitation = HttpApiEndpoint.get(
  "getInvitation",
  "/invitations/:organizationSlug",
)
  .setPath(OrganizationApiSchemas.getInvitation.path)
  .setUrlParams(OrganizationApiSchemas.getInvitation.urlParams)
  .addSuccess(OrganizationApiSchemas.getInvitation.response)
  .addError(HttpApiError.NotFound);

const acceptInvitation = HttpApiEndpoint.post(
  "acceptInvitation",
  "/invitations/:id/accept",
)
  .setPath(OrganizationApiSchemas.acceptInvitation.path)
  .setPayload(OrganizationApiSchemas.acceptInvitation.request)
  .addSuccess(OrganizationApiSchemas.acceptInvitation.response)
  .addError(HttpApiError.NotFound);

const getMembers = HttpApiEndpoint.get(
  "getMembers",
  "/members/:organizationSlug",
)
  .addSuccess(OrganizationApiSchemas.getMembers.response)
  .addError(HttpApiError.NotFound)
  .setPath(OrganizationApiSchemas.getMembers.path);

const getInvitations = HttpApiEndpoint.get("getInvitations", "/invitations")
  .addSuccess(OrganizationApiSchemas.getInvitations.response)
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
  // .add(deleteOrganization)
  // .add(updateOrganization)
  .addError(Unauthorized, { status: 401 });

// Combine the groups into one API
const api = HttpApi.make("organizationApi").add(organizationsGroup);

// Export the API definition for client generation (TypeOnce.dev pattern)
export { api as organizationApi };

const organizationsGroupLive = HttpApiBuilder.group(
  api,
  "organizations",
  (handlers) =>
    Effect.gen(function* () {
      const repository = yield* OrgService;
      const invitationService = yield* InvitationUseCase;
      return handlers
        .handle(
          "createOrganization",
          ({ payload: { organization, userId } }) => {
            return repository.create(organization, userId).pipe(
              Effect.mapError((error) => {
                return new HttpApiError.HttpApiDecodeError({
                  message: error.message,
                  issues: [
                    {
                      _tag: "Type",
                      message: error.message,
                      path: [],
                    },
                  ],
                });
              }),
            );
          },
        )
        .handle("getOrganization", ({ path: { organizationSlug } }) => {
          return repository.get(organizationSlug).pipe(
            Effect.map((organization) => organization),
            Effect.mapError((error) => {
              return new HttpApiError.HttpApiDecodeError({
                message: error.message,
                issues: [
                  {
                    _tag: "Type",
                    message: error.message,
                    path: [],
                  },
                ],
              });
            }),
          );
        })
        .handle("createInvitation", ({ payload: { newInvitation } }) => {
          return invitationService.create(newInvitation).pipe(
            Effect.map((invitation) => {
              // Ensure the invitation returned has all required properties
              return { invitation };
            }),
            Effect.mapError((error) => {
              return new HttpApiError.HttpApiDecodeError({
                message: error.message,
                issues: [
                  {
                    _tag: "Type",
                    message: error.message,
                    path: [],
                  },
                ],
              });
            }),
          );
        })
        .handle("getInvitation", ({ urlParams: { token } }) => {
          return invitationService.get(token).pipe(
            Effect.mapError(
              (error) =>
                new HttpApiError.HttpApiDecodeError({
                  message: error.message,
                  issues: [
                    {
                      _tag: "Type",
                      message: error.message,
                      path: [],
                    },
                  ],
                }),
            ),
          );
        })
        .handle("getMembers", ({ path: { organizationSlug } }) => {
          return Effect.gen(function* () {
            const memberRepo = yield* MemberRepo;
            return yield* memberRepo.getMembers.pipe(
              Effect.map((members) => members),
              Effect.mapError(
                (error) =>
                  new HttpApiError.HttpApiDecodeError({
                    message: error.message || String(error),
                    issues: [],
                  }),
              ),
            );
          });
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
                  }),
              ),
            );
          });
        })
        .handle(
          "acceptInvitation",
          ({ path: { id }, payload: { token, userId } }) => {
            return Effect.gen(function* () {
              try {
                const result = yield* invitationService
                  .accept(token, userId)
                  .pipe(
                    Effect.tap(() => {}),
                    Effect.map(() => {
                      return { ok: true };
                    }),
                    Effect.mapError((error) => {
                      return new HttpApiError.HttpApiDecodeError({
                        message: error?.message || String(error),
                        issues: [
                          {
                            _tag: "Type",
                            message: error?.message || String(error),
                            path: [],
                          },
                        ],
                      });
                    }),
                    Effect.tap(() => {}),
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
                  }),
                );
              }
            });
          },
        );
    }),
);

export function getOrgHandler(doState: DurableObjectState) {
  // Member repository layer
  const MemberServiceLayer = Layer.provide(MemberRepoLive, DrizzleDOClientLive);

  // Organization repository layer
  const OrgServiceLayer = Layer.provide(
    OrgRepoLive,
    Layer.merge(DrizzleDOClientLive, MemberServiceLayer),
  );

  const DORepoLayer = Layer.succeed(DurableObjectState, doState);

  const InvitationRepoLayer = Layer.provide(
    InvitationLayerLive(doState.id),
    DORepoLayer,
  );

  const finalLayer = Layer.provide(
    Layer.mergeAll(OrgServiceLayer, InvitationRepoLayer, MemberServiceLayer),
    DORepoLayer,
  );

  // Organizations group layer with all dependencies
  const organizationsGroupLayerLive = Layer.provide(
    organizationsGroupLive,
    finalLayer,
  );

  // API layer with Swagger
  const OrganizationApiLive = HttpApiBuilder.api(api).pipe(
    Layer.provide(organizationsGroupLayerLive),
  );

  const SwaggerLayer = HttpApiSwagger.layer().pipe(
    Layer.provide(OrganizationApiLive),
  );

  // Final handler with all layers merged
  const { dispose, handler } = HttpApiBuilder.toWebHandler(
    Layer.mergeAll(OrganizationApiLive, SwaggerLayer, HttpServer.layerContext),
  );

  // Wrap handler with additional error logging
  const wrappedHandler = async (request: Request): Promise<Response> => {
    const response = await handler(request);
    return response;
  };

  return { dispose, handler: wrappedHandler };
}
