import type { DOInteractionError } from "@/infrastructure/cloudflare/durable-objects/OrganizationDONameSpace";
import { Context, type Effect } from "effect";
import type { OrgDbError } from "../model";
import type {
  OrganizationProvisionPayload,
  OrganizationProvisionResult,
} from "./model";

export class OrganizationProvision extends Context.Tag(
  "core/organization/OrganizationProvision",
)<
  OrganizationProvision,
  {
    create: (
      payload: OrganizationProvisionPayload,
    ) => Effect.Effect<
      OrganizationProvisionResult,
      OrgDbError | DOInteractionError
    >;
  }
>() {}
