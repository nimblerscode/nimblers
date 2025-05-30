import { Effect, Layer } from "effect";
import type { OrganizationProvisionPayload } from "@/domain/tenant/organization/provision/model";
import { OrganizationProvision } from "@/domain/tenant/organization/provision/service";
import {
  ConnectedStoreRepo,
  OrganizationDOService,
  OrganizationUseCase,
  OrgService,
} from "@/domain/tenant/organization/service";

export const OrganizationProvisionLive = Layer.effect(
  OrganizationProvision,
  Effect.gen(function* (_) {
    const organizationDOService = yield* OrganizationDOService;

    return {
      get: (slug: string) =>
        Effect.gen(function* () {
          const result = yield* organizationDOService.getOrganization(slug);
          return result;
        }),
      create: (payload: OrganizationProvisionPayload) =>
        Effect.gen(function* () {
          const { organization, creatorId } = payload;

          // Use the service to create the organization
          const result = yield* organizationDOService.createOrganization(
            organization,
            creatorId,
          );

          return result;
        }),
    };
  }),
);

export const OrganizationUseCaseLive = Layer.effect(
  OrganizationUseCase,
  Effect.gen(function* () {
    const orgService = yield* OrgService;
    const connectedStoreRepo = yield* ConnectedStoreRepo;

    return {
      createOrg: (data, creatorUserId) =>
        Effect.gen(function* () {
          const result = yield* orgService.create(data, creatorUserId);
          return { org: result, memberCreateData: {} }; // Return expected format
        }),

      getOrgBySlug: (slug) =>
        Effect.gen(function* () {
          return yield* orgService.get(slug);
        }),

      getOrgWithStores: (slug) =>
        Effect.gen(function* () {
          const org = yield* orgService.get(slug);
          const connectedStores = yield* connectedStoreRepo.getByOrganizationId(
            org.id,
          );
          return { ...org, connectedStores }; // Use connectedStores instead of stores
        }),

      connectStore: (organizationId, storeData) =>
        Effect.gen(function* () {
          return yield* connectedStoreRepo.create({
            ...storeData,
            organizationId,
          });
        }),

      disconnectStore: (organizationId, shopDomain) =>
        Effect.gen(function* () {
          const store = yield* connectedStoreRepo.getByShopDomain(shopDomain);
          if (store) {
            yield* connectedStoreRepo.delete(store.id);
          }
        }),

      getConnectedStores: (organizationId) =>
        Effect.gen(function* () {
          return yield* connectedStoreRepo.getByOrganizationId(organizationId);
        }),
    };
  }),
);
