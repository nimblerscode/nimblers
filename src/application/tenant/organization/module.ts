import { Layer } from "effect";
import { OrganizationCreatorLive } from "./create";
import { OrganizationProvisionLive } from "./service.live";

// Compose all organization-related layers in a single module
export const OrganizationModule = Layer.merge(
  OrganizationProvisionLive,
  OrganizationCreatorLive,
);
