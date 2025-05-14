import type { UserId } from "@/domain/global/user/model";
import type { NewOrganization, Organization } from "../model";

export type OrganizationProvisionPayload = {
  organization: NewOrganization;
  creatorId: UserId;
};

export type OrganizationProvisionResult = Organization;
