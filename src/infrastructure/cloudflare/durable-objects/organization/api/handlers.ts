import { InvitationLayerLive } from "@/config/layers";
import { UserIdSchema } from "@/domain/global/user/model";
import {
  InvitationSchema,
  NewInvitationSchema,
} from "@/domain/tenant/invitations/models";
import { InvitationUseCase } from "@/domain/tenant/invitations/service";
import { MemberSchema } from "@/domain/tenant/member/model";
import { MemberRepo } from "@/domain/tenant/member/service";
import {
  NewOrganizationSchema,
  OrganizationSchema,
} from "@/domain/tenant/organization/model";
import { OrgService } from "@/domain/tenant/organization/service";
import {
  DrizzleDOClientLive,
  DurableObjectState,
} from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { MemberRepoLive } from "@/infrastructure/persistence/tenant/sqlite/MemberRepoLive";
import { OrgRepoLive } from "@/infrastructure/persistence/tenant/sqlite/OrgRepoLive";
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

const idParam = HttpApiSchema.param("id", Schema.NumberFromString);

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {}
) {}

const _getOrganizations = HttpApiEndpoint.get(
  "getOrganizations",
  "/organizations"
).addSuccess(Schema.Array(OrganizationSchema));

const getOrganization = HttpApiEndpoint.get(
  "getOrganization"
)`/organization/:organizationSlug`
  .addSuccess(OrganizationSchema)
  .addError(HttpApiError.NotFound)
  .setPath(Schema.Struct({ organizationSlug: Schema.String }));

const createOrganization = HttpApiEndpoint.post(
  "createOrganization",
  "/organization"
)
  .setPayload(
    Schema.Struct({
      organization: NewOrganizationSchema,
      userId: UserIdSchema,
    })
  )
  .addSuccess(OrganizationSchema);

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
  .addSuccess(OrganizationSchema);

const createInvitation = HttpApiEndpoint.post("createInvitation", "/invite")
  .setPayload(
    Schema.Struct({
      newInvitation: NewInvitationSchema,
    })
  )
  .addSuccess(
    Schema.Struct({
      invitation: InvitationSchema,
    })
  )
  .addError(HttpApiError.BadRequest);
// .addError(HttpApiError.InternalServerError);

// Define a GET endpoint with a path parameter ":id"
const getInvitation = HttpApiEndpoint.get(
  "getInvitation",
  "/invitations/:organizationSlug"
)
  .setPath(
    Schema.Struct({
      organizationSlug: Schema.String,
    })
  )
  .setUrlParams(
    Schema.Struct({
      token: Schema.String,
    })
  )
  .addSuccess(InvitationSchema)
  .addError(HttpApiError.NotFound);

const _acceptInvitation = HttpApiEndpoint.post(
  "acceptInvitation",
  "/invitations/:id/accept"
)
  .setPayload(Schema.Struct({ token: Schema.String }))
  .addSuccess(
    Schema.Struct({
      ok: Schema.Boolean,
    })
  )
  .addError(HttpApiError.NotFound);

const getMembers = HttpApiEndpoint.get(
  "getMembers",
  "/members/:organizationSlug"
)
  .addSuccess(Schema.Array(MemberSchema))
  .addError(HttpApiError.NotFound)
  .setPath(
    Schema.Struct({
      organizationSlug: Schema.String,
    })
  );

// Group all user-related endpoints
const organizationsGroup = HttpApiGroup.make("organizations")
  // .add(getOrganizations)
  .add(getOrganization)
  .add(createOrganization)
  .add(createInvitation)
  .add(getInvitation)
  .add(getMembers)
  // .add(acceptInvitation)
  // .add(deleteOrganization)
  // .add(updateOrganization)
  .addError(Unauthorized, { status: 401 });

// Combine the groups into one API
const api = HttpApi.make("organizationApi").add(organizationsGroup);

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
                console.log("error from createOrganization", error);
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
              })
            );
          }
        )
        .handle("getOrganization", ({ path: { organizationSlug } }) => {
          return repository.get(organizationSlug).pipe(
            Effect.map((organization) => organization),
            Effect.mapError((error) => {
              console.error(
                `Failed to get organization ${organizationSlug}:`,
                error
              );
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
            })
          );
        })
        .handle("createInvitation", ({ payload: { newInvitation } }) => {
          console.log("createInvitation handler", newInvitation);
          return invitationService.create(newInvitation).pipe(
            Effect.map((invitation) => {
              // Ensure the invitation returned has all required properties
              return { invitation };
            }),
            Effect.mapError((error) => {
              console.log("error from createInvitation", error);
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
            })
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
                })
            )
          );
        })
        .handle("getMembers", ({ path: { organizationSlug } }) => {
          return Effect.gen(function* () {
            console.log("getMembers handler", organizationSlug);
            const memberRepo = yield* MemberRepo;
            return yield* memberRepo.getMembers.pipe(
              Effect.map((members) => members),
              Effect.mapError(
                (error) =>
                  new HttpApiError.HttpApiDecodeError({
                    message: error.message || String(error),
                    issues: [],
                  })
              )
            );
          });
        });
      // .handle("acceptInvitation", ({ payload: { token } }) => {
      //   return invitationService
      //     .accept({
      //       token,
      //     })
      //     .pipe(
      //       Effect.map((member) => {
      //         return { ok: true };
      //       })
      //     )
      //     .pipe(
      //       Effect.mapError(
      //         (error: unknown) =>
      //           new HttpApiError.HttpApiDecodeError({
      //             message: error.message,
      //             issues: [
      //               {
      //                 _tag: "Type",
      //                 message: error.message,
      //                 path: [],
      //               },
      //             ],
      //           })
      //       )
      //     );
      // });
    })
);

export function getOrgHandler(doState: DurableObjectState) {
  // Member repository layer
  const MemberServiceLayer = Layer.provide(MemberRepoLive, DrizzleDOClientLive);

  // Organization repository layer
  const OrgServiceLayer = Layer.provide(
    OrgRepoLive,
    Layer.merge(DrizzleDOClientLive, MemberServiceLayer)
  );

  const DORepoLayer = Layer.succeed(DurableObjectState, doState);

  const InvitationRepoLayer = Layer.provide(
    InvitationLayerLive(doState.id),
    DORepoLayer
  );

  const finalLayer = Layer.provide(
    Layer.mergeAll(OrgServiceLayer, InvitationRepoLayer, MemberServiceLayer),
    DORepoLayer
  );

  // Organizations group layer with all dependencies
  const organizationsGroupLayerLive = Layer.provide(
    organizationsGroupLive,
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

  return { dispose, handler };
}
