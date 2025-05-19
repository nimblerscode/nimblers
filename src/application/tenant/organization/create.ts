import { Context, Effect, Layer } from "effect";
import type { UserId } from "@/domain/global/user/model";
import type {
  NewOrganization,
  Organization,
} from "@/domain/tenant/organization/model";
import type { OrganizationProvisionPayload } from "@/domain/tenant/organization/provision/model";
import {
  OrganizationProvision,
  type OrganizationProvisionError,
} from "@/domain/tenant/organization/provision/service";

// Application service as a Context Tag
export class OrganizationCreator extends Context.Tag(
  "application/organization/Creator",
)<
  OrganizationCreator,
  {
    create: (
      input: NewOrganization,
      creatorId: UserId,
    ) => Effect.Effect<Organization, OrganizationProvisionError>;
  }
>() {}

// Live implementation
export const OrganizationCreatorLive = Layer.effect(
  OrganizationCreator,
  Effect.gen(function* (_) {
    const orgProvisionService = yield* OrganizationProvision;

    return {
      create: (input, creatorId) =>
        Effect.gen(function* () {
          // Transform input to domain payload if needed
          const payload: OrganizationProvisionPayload = {
            organization: input,
            creatorId,
          };

          // Delegate to domain service
          const result = yield* orgProvisionService.create(payload);

          return result;
        }),
    };
  }),
);
