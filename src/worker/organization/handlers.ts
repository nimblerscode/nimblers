import { Layer } from "effect";

import {
  OrgCreateInputSchema,
  OrganizationSchema,
} from "@/core/organization/model";
import { OrgService } from "@/core/organization/service";
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
  DrizzleDOClientLive,
  DurableObjectStorage,
} from "@/infra/db/drizzle/drizzleDO";
import { MemberRepoLive } from "@/infra/db/repositories/MemberRepoLive";
import { OrgRepoLiveLayer } from "@/infra/db/repositories/OrgRepoLive";
import { HttpApiGroup, HttpApiSchema } from "@effect/platform";

const idParam = HttpApiSchema.param("id", Schema.NumberFromString);

// Define error schemas
class OrganizationNotFound extends Schema.TaggedError<OrganizationNotFound>()(
  "OrganizationNotFound",
  {},
) {}

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
      organization: OrgCreateInputSchema,
      userId: Schema.String,
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

// Group all user-related endpoints
const organizationsGroup = HttpApiGroup.make("organizations")
  // .add(getOrganizations)
  // .add(getOrganization)
  .add(createOrganization)
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
      return handlers.handle(
        "createOrganization",
        ({ payload: { organization, userId } }) => {
          return repository.createOrg(organization, userId).pipe(
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
      );
    }),
);

export function getOrgHandler(doState: DurableObjectState) {
  // Here will be better to use a layer for the DurableObjectState
  // to avoid having to pass it around.

  const BaseInfraLayer = DrizzleDOClientLive;

  // MemberRepoServiceLayer: Provides MemberRepo, requires DrizzleDOClient (from BaseInfraLayer)
  const MemberServiceLayer = Layer.provide(MemberRepoLive, BaseInfraLayer);

  // OrgRepoServiceLayer: Provides OrgService, requires DrizzleDOClient (from BaseInfraLayer)
  // and MemberRepo (from MemberServiceLayer)
  const OrgServiceLayer = Layer.provide(
    OrgRepoLiveLayer,
    Layer.merge(BaseInfraLayer, MemberServiceLayer), // Provides both DrizzleDOClient and MemberRepo
  );

  const DOLayer = Layer.merge(OrgServiceLayer, MemberServiceLayer);

  const finalLayer = Layer.provide(
    DOLayer, // DOLayer now requires DurableObjectStorage
    Layer.succeed(DurableObjectStorage, doState),
  );

  const organizationsGroupLiveProvided = Layer.provide(
    organizationsGroupLive,
    finalLayer,
  );

  // Provide organizationsGroupLiveProvided to MyApiLive
  const MyApiLive = HttpApiBuilder.api(api).pipe(
    Layer.provide(organizationsGroupLiveProvided),
  );

  // SwaggerLayer depends on MyApiLive
  const SwaggerLayer = HttpApiSwagger.layer().pipe(Layer.provide(MyApiLive));

  // Now merge only fully provided layers
  const { dispose, handler } = HttpApiBuilder.toWebHandler(
    Layer.mergeAll(MyApiLive, SwaggerLayer, HttpServer.layerContext),
  );

  return { dispose, handler };
}
