import { Layer } from "effect";

import {
  InvitationSchema,
  NewInvitationSchema,
} from "@/domain/tenant/invitations/models";
import {
  NewOrganizationSchema,
  OrganizationSchema,
} from "@/domain/tenant/organization/model";
import { OrgService } from "@/domain/tenant/organization/service";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiSwagger,
  HttpServer,
} from "@effect/platform";
import { Effect, Schema } from "effect";

import {
  AcceptInvitationUseCase,
  AcceptInvitationUseCaseLive,
} from "@/application/global/invitations/acceptInvitation";
import {
  CreateInvitationUseCase,
  CreateInvitationUseCaseLive,
} from "@/application/tenant/invitations/create";
import {
  GetInvitationUseCase,
  GetInvitationUseCaseLive,
} from "@/application/tenant/invitations/get";
import { DatabaseLive } from "@/config/layers";
import { UserIdSchema } from "@/domain/global/user/model";
import { InvitationIdSchema } from "@/domain/tenant/invitations/models";
import { OrgInvitationRepoLive } from "@/domain/tenant/invitations/service";
import { ResendEmailAdapterLive } from "@/infrastructure/email/resend/adapter";
import { ResendConfigLive } from "@/infrastructure/email/resend/config";
import { UserRepoLive } from "@/infrastructure/persistence/global/d1/UserRepoAdapter";
import { MemberRepoLive } from "@/infrastructure/persistence/tenant/sqlite/MemberRepoLive";
import { OrgRepoLive } from "@/infrastructure/persistence/tenant/sqlite/OrgRepoLive";
import {
  DrizzleDOClientLive,
  DurableObjectStorage,
} from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { HttpApiGroup, HttpApiSchema } from "@effect/platform";

const idParam = HttpApiSchema.param("id", Schema.NumberFromString);

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
) {}

const getOrganizations = HttpApiEndpoint.get(
  "getOrganizations",
  "/organizations",
).addSuccess(Schema.Array(OrganizationSchema));

const getOrganization = HttpApiEndpoint.get(
  "getOrganization",
)`/organization/${idParam}`
  .addSuccess(OrganizationSchema)
  .addError(HttpApiError.NotFound);

const createOrganization = HttpApiEndpoint.post(
  "createOrganization",
  "/organization",
)
  .setPayload(
    Schema.Struct({
      organization: NewOrganizationSchema,
      userId: UserIdSchema,
    }),
  )
  .addSuccess(OrganizationSchema);

const deleteOrganization = HttpApiEndpoint.del(
  "deleteOrganization",
)`/organizations/${idParam}`;

const updateOrganization = HttpApiEndpoint.patch(
  "updateOrganization",
)`/organizations/${idParam}`
  .setPayload(
    Schema.Struct({
      name: Schema.String,
    }),
  )
  .addSuccess(OrganizationSchema);

const createInvitation = HttpApiEndpoint.post(
  "createInvitation",
  "/organizations/:id/invitations",
)
  .setPath(
    Schema.Struct({
      id: InvitationIdSchema,
    }),
  )
  .setPayload(NewInvitationSchema)
  .addSuccess(InvitationSchema);

// Define a GET endpoint with a path parameter ":id"
const getInvitation = HttpApiEndpoint.get("getInvitation", "/invitations")
  // .setPath(
  //   Schema.Struct({
  //     token: Schema.String,
  //   })
  // )
  .setUrlParams(
    Schema.Struct({
      token: Schema.String,
    }),
  )
  .addSuccess(InvitationSchema)
  .addError(HttpApiError.NotFound);

const acceptInvitation = HttpApiEndpoint.post(
  "acceptInvitation",
  "/invitations/:id/accept",
)
  .setPayload(Schema.Struct({ token: Schema.String }))
  .addSuccess(
    Schema.Struct({
      ok: Schema.Boolean,
    }),
  )
  .addError(HttpApiError.NotFound);

// Group all user-related endpoints
const organizationsGroup = HttpApiGroup.make("organizations")
  // .add(getOrganizations)
  // .add(getOrganization)
  .add(createOrganization)
  .add(createInvitation)
  .add(getInvitation)
  .add(acceptInvitation)
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
      const getInvitationRepository = yield* GetInvitationUseCase;
      const createInvitationRepository = yield* CreateInvitationUseCase;
      const acceptInvitationRepository = yield* AcceptInvitationUseCase;
      return handlers
        .handle(
          "createOrganization",
          ({ payload: { organization, userId } }) => {
            return repository.create(organization, userId).pipe(
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
          },
        )
        .handle(
          "createInvitation",
          ({ payload: { organizationId, inviterId, inviteeEmail, role } }) => {
            return createInvitationRepository
              .create({
                organizationId,
                inviterId,
                inviteeEmail,
                role,
              })
              .pipe(
                Effect.map(({ invitation, token }) => {
                  // Ensure the invitation returned has all required properties
                  return { ...invitation, token };
                }),
              )
              .pipe(
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
          },
        )
        .handle("getInvitation", ({ urlParams: { token } }) => {
          return getInvitationRepository.get(token).pipe(
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
        .handle("acceptInvitation", ({ payload: { token } }) => {
          return acceptInvitationRepository
            .accept({
              token,
            })
            .pipe(
              Effect.map((member) => {
                // Return an object with the required 'ok' property
                return { ok: true }; // Indicate success
              }),
            )
            .pipe(
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
        });
    }),
);

export function getOrgHandler(doState: DurableObjectState, db: D1Database) {
  // Here will be better to use a layer for the DurableObjectState
  // to avoid having to pass it around.

  // MemberRepoServiceLayer: Provides MemberRepo, requires DrizzleDOClient (from BaseInfraLayer)
  const MemberServiceLayer = Layer.provide(MemberRepoLive, DrizzleDOClientLive);

  // OrgRepoServiceLayer: Provides OrgService, requires DrizzleDOClient (from BaseInfraLayer)
  // and MemberRepo (from MemberServiceLayer)
  const OrgServiceLayer = Layer.provide(
    OrgRepoLive,
    Layer.merge(DrizzleDOClientLive, MemberServiceLayer), // Provides both DrizzleDOClient and MemberRepo
  );

  const OrgInvitationRepoLayer = Layer.provide(
    OrgInvitationRepoLive,
    DrizzleDOClientLive,
  );

  const CreateInvitationUseCaseLayer = Layer.merge(
    Layer.provide(ResendEmailAdapterLive, ResendConfigLive),
    MemberServiceLayer,
  );

  const GetInvitationUseCaseLayer = Layer.provide(
    GetInvitationUseCaseLive,
    OrgInvitationRepoLayer,
  );

  const InvitationUseCaseLayer = Layer.provide(
    Layer.provide(CreateInvitationUseCaseLive, OrgInvitationRepoLayer),
    CreateInvitationUseCaseLayer,
  );

  const AcceptInvitationUseCaseLayer = Layer.provide(
    AcceptInvitationUseCaseLive,
    Layer.mergeAll(
      GetInvitationUseCaseLayer,
      OrgInvitationRepoLayer,
      MemberServiceLayer,
      Layer.provide(UserRepoLive, DatabaseLive({ DB: db })),
    ),
  );

  const DOLayerLive = Layer.mergeAll(
    OrgServiceLayer,
    MemberServiceLayer,
    InvitationUseCaseLayer,
    GetInvitationUseCaseLayer,
    AcceptInvitationUseCaseLayer,
  );

  const finalLayer = Layer.provide(
    DOLayerLive, // DOLayer now requires DurableObjectStorage
    Layer.succeed(DurableObjectStorage, doState),
  );

  const organizationsGroupLayerLive = Layer.provide(
    organizationsGroupLive,
    finalLayer,
  );

  // Provide organizationsGroupLiveProvided to MyApiLive
  const OrganizationApiLive = HttpApiBuilder.api(api).pipe(
    Layer.provide(organizationsGroupLayerLive),
  );

  // SwaggerLayer depends on OrganizationApiLive
  const SwaggerLayer = HttpApiSwagger.layer().pipe(
    Layer.provide(OrganizationApiLive),
  );

  // Now merge only fully provided layers
  const { dispose, handler } = HttpApiBuilder.toWebHandler(
    Layer.mergeAll(OrganizationApiLive, SwaggerLayer, HttpServer.layerContext),
  );

  return { dispose, handler };
}
