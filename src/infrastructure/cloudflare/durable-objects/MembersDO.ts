import { FetchHttpClient } from "@effect/platform";
import { Effect, Layer } from "effect";
import { MemberDOError } from "@/domain/tenant/member/model";
import { MemberDOService } from "@/domain/tenant/member/service";
import { OrganizationDONamespace } from "./OrganizationDONameSpace";
import { createOrganizationDOClient } from "./organization/api/client";
import type { OrganizationSlug } from "@/domain/global/organization/models";

export const MembersDOServiceLive = Layer.effect(
  MemberDOService,
  Effect.gen(function* () {
    const orgDONamespace = yield* OrganizationDONamespace;

    const get = (slug: OrganizationSlug) => {
      return Effect.gen(function* () {
        const doId = orgDONamespace.idFromName(slug);
        const stub = orgDONamespace.get(doId);

        // Create type-safe client using TypeOnce.dev pattern
        const client = yield* createOrganizationDOClient(stub);

        // Use auto-generated method with perfect type safety!
        // The client.organizations.getMembers method is automatically generated
        // from the HttpApi definition in handlers.ts
        const members = yield* client.organizations
          .getMembers({
            path: { organizationSlug: slug },
          })
          .pipe(
            Effect.mapError((error) => {
              // Map HTTP API errors to domain errors
              return new MemberDOError({
                cause: error,
              });
            })
          );

        // Convert readonly array to mutable array to match service interface
        return [...members];
      }).pipe(
        // Provide the HttpClient layer needed by the client
        Effect.provide(FetchHttpClient.layer)
      );
    };

    return {
      get,
    };
  })
);
