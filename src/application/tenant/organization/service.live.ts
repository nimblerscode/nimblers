import { Effect, Layer } from "effect";
import type { OrganizationProvisionPayload } from "@/domain/tenant/organization/provision/model";
import { OrganizationProvision } from "@/domain/tenant/organization/provision/service";
import {
  ConnectedStoreRepo,
  OrganizationDOService,
  OrganizationUseCase,
  OrgService,
} from "@/domain/tenant/organization/service";
import type { OrganizationSlug } from "@/domain/global/organization/models";

export const OrganizationProvisionLive = Layer.effect(
  OrganizationProvision,
  Effect.gen(function* (_) {
    const organizationDOService = yield* OrganizationDOService;

    return {
      get: (slug: OrganizationSlug) =>
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
            creatorId
          );

          return result;
        }),
    };
  })
);

export const OrganizationUseCaseLive = Layer.effect(
  OrganizationUseCase,
  Effect.gen(function* () {
    const orgService = yield* OrgService;
    const connectedStoreRepo = yield* ConnectedStoreRepo;

    return {
      createOrg: (data, creatorUserId) =>
        Effect.gen(function* () {
          yield* Effect.log("=== ORGANIZATION USE CASE CREATE START ===").pipe(
            Effect.annotateLogs({
              data: JSON.stringify(data, null, 2),
              creatorUserId,
              timestamp: new Date().toISOString(),
            })
          );

          yield* Effect.log("OrgService available, calling create method").pipe(
            Effect.annotateLogs({
              orgServiceType: typeof orgService,
              availableMethods: Object.keys(orgService),
            })
          );

          yield* Effect.log("Calling orgService.create").pipe(
            Effect.annotateLogs({
              data: JSON.stringify(data, null, 2),
              creatorUserId,
            })
          );

          const result = yield* orgService.create(data, creatorUserId).pipe(
            Effect.tap((res) =>
              Effect.log("OrgService.create completed successfully").pipe(
                Effect.annotateLogs({
                  result: JSON.stringify(res, null, 2),
                  timestamp: new Date().toISOString(),
                })
              )
            ),
            Effect.tapError((error) =>
              Effect.logError("OrgService.create failed").pipe(
                Effect.annotateLogs({
                  error: error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : undefined,
                  timestamp: new Date().toISOString(),
                })
              )
            )
          );

          yield* Effect.log(
            "=== ORGANIZATION USE CASE CREATE SUCCESS ==="
          ).pipe(
            Effect.annotateLogs({
              finalResult: JSON.stringify(result, null, 2),
              timestamp: new Date().toISOString(),
            })
          );

          return { org: result, memberCreateData: {} as any }; // Return expected format
        }),

      getOrgBySlug: (slug) =>
        Effect.gen(function* () {
          return yield* orgService.get(slug);
        }),

      getOrgWithStores: (slug) =>
        Effect.gen(function* () {
          const org = yield* orgService.get(slug);
          const connectedStores = yield* connectedStoreRepo.getByOrganizationId(
            org.id
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
  })
);
