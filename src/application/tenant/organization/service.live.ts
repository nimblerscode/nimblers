import { Effect, Layer } from "effect";
import type { OrganizationProvisionPayload } from "@/domain/tenant/organization/provision/model";
import { OrganizationProvision } from "@/domain/tenant/organization/provision/service";
import { OrganizationDOService } from "@/domain/tenant/organization/service";

export const OrganizationProvisionLive = Layer.effect(
  OrganizationProvision,
  Effect.gen(function* (_) {
    const organizationDOService = yield* OrganizationDOService;

    return {
      create: (payload: OrganizationProvisionPayload) =>
        Effect.gen(function* () {
          const { organization, creatorId } = payload;

          // Use the service to create the organization
          const result = yield* organizationDOService.createOrganization(
            organization,
            creatorId
          );

          return result;
        }),
    };
  })
);
