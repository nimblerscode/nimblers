import { Context, Data, type Effect } from "effect";
import type {
  OrganizationProvisionPayload,
  OrganizationProvisionResult,
} from "./model";

// Define domain-specific errors
export class OrganizationProvisionError extends Data.TaggedError(
  "OrganizationProvisionError",
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class OrganizationProvision extends Context.Tag(
  "core/organization/OrganizationProvision",
)<
  OrganizationProvision,
  {
    create: (
      payload: OrganizationProvisionPayload,
    ) => Effect.Effect<OrganizationProvisionResult, OrganizationProvisionError>;
  }
>() {}
