"use server";

import { Data } from "effect";
import { requestInfo } from "rwsdk/worker";
import type { CampaignType } from "@/domain/tenant/campaigns/models";
import type { AppContext } from "@/infrastructure/cloudflare/worker";

// Define Effect-TS branded error types following project patterns
export class AuthenticationError extends Data.TaggedError(
  "AuthenticationError"
)<{
  readonly message: string;
  readonly code?: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly code: string;
  readonly field?: string;
}> {}

export class CampaignCreationError extends Data.TaggedError(
  "CampaignCreationError"
)<{
  readonly message: string;
  readonly code?: string;
  readonly cause?: unknown;
}> {}

// Union type for all possible errors
type CreateCampaignError =
  | AuthenticationError
  | ValidationError
  | CampaignCreationError;

// Serializable error information
export interface SerializableError {
  type: string;
  message: string;
  code?: string;
  field?: string;
}

// Serializable campaign data
export interface SerializableCampaign {
  id: string;
  name: string;
  description?: string;
  campaignType: string;
  status: string;
  timezone: string;
  segmentIds: string[];
  createdAt: string;
  updatedAt: string;
}

// Serializable segment data
export interface SerializableSegment {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateCampaignState =
  | {
      success: false;
      message: string;
      errors: SerializableError | null;
      user: { id: string };
    }
  | {
      success: true;
      message: string;
      errors: null;
      campaign: SerializableCampaign;
      segment: SerializableSegment;
      user: { id: string };
    };

// Basic validation functions
const validateUser = (user: { id: string } | undefined) => {
  if (!user || !user.id || user.id === "unknown") {
    throw new AuthenticationError({
      message: "User authentication required",
      code: "USER_NOT_AUTHENTICATED",
    });
  }
  return user;
};

const validateFormData = (formData: FormData) => {
  const name = formData.get("name") as string;
  const campaignType = formData.get("campaignType") as CampaignType;
  const timezone = formData.get("timezone") as string;
  const organizationSlug = formData.get("organizationSlug") as string;

  if (!name) {
    throw new ValidationError({
      message: "Campaign name is required",
      code: "MISSING_NAME",
      field: "name",
    });
  }

  if (!campaignType) {
    throw new ValidationError({
      message: "Campaign type is required",
      code: "MISSING_CAMPAIGN_TYPE",
      field: "campaignType",
    });
  }

  if (!timezone) {
    throw new ValidationError({
      message: "Timezone is required",
      code: "MISSING_TIMEZONE",
      field: "timezone",
    });
  }

  if (!organizationSlug) {
    throw new ValidationError({
      message: "Organization is required",
      code: "MISSING_ORGANIZATION",
      field: "organizationSlug",
    });
  }

  const validCampaignTypes = ["sms", "email", "whatsapp", "push_notification"];
  if (!validCampaignTypes.includes(campaignType)) {
    throw new ValidationError({
      message: "Invalid campaign type selected",
      code: "INVALID_CAMPAIGN_TYPE",
      field: "campaignType",
    });
  }

  return {
    name,
    description: formData.get("description") as string,
    campaignType,
    timezone,
    organizationSlug,
  };
};

const convertToSerializableError = (
  error: CreateCampaignError
): SerializableError => {
  switch (error._tag) {
    case "AuthenticationError":
      return {
        type: "AuthenticationError",
        message: error.message,
        code: error.code,
      };
    case "ValidationError":
      return {
        type: "ValidationError",
        message: error.message,
        code: error.code,
        field: error.field,
      };
    case "CampaignCreationError":
      return {
        type: "CampaignCreationError",
        message: error.message,
        code: error.code,
      };
  }
};

export async function createCampaignAction(
  prevState: CreateCampaignState,
  formData: FormData
): Promise<CreateCampaignState> {
  try {
    // Get user context
    const { ctx } = requestInfo;
    const appCtx = ctx as AppContext;

    // Validate user authentication
    const user = validateUser(appCtx.user);

    // Validate and extract form data
    const { name, description, campaignType, timezone, organizationSlug } =
      validateFormData(formData);

    // For now, return a placeholder since campaign endpoints aren't implemented yet in OrganizationDO
    // TODO: Add campaign endpoints to OrganizationDO API
    return {
      success: true,
      message: `Campaign "${name}" would be created in organization "${organizationSlug}" (placeholder)`,
      errors: null,
      campaign: {
        id: `campaign-${Date.now()}`,
        name,
        description: description || undefined,
        campaignType,
        status: "draft",
        timezone,
        segmentIds: [`segment-${Date.now()}`],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      segment: {
        id: `segment-${Date.now()}`,
        name: `${name} - User Segment`,
        description: `Automatically created segment for campaign: ${name}`,
        type: "manual",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      user,
    };

    // Uncomment this when campaign endpoints are added to OrganizationDO:
    /*
    const program = pipe(
      Effect.gen(function* () {
        const orgService = yield* OrganizationDOService;
        
        // This will need to be implemented in OrganizationDO:
        // const result = yield* orgService.createCampaign(organizationSlug, {
        //   name,
        //   description,
        //   campaignType,
        //   timezone,
        // });
        
        return result;
      }),
      Effect.catchAll((error) => {
        return Effect.succeed({
          success: false,
          message: error.message || "Failed to create campaign",
          errors: convertToSerializableError(error),
          user,
        } as CreateCampaignState);
      })
    );

    const orgDOLayer = OrganizationDOLive({ ORG_DO: env.ORG_DO });
    return Effect.runPromise(program.pipe(Effect.provide(orgDOLayer)));
    */
  } catch (error) {
    const createCampaignError = error as CreateCampaignError;
    return {
      success: false,
      message: createCampaignError.message || "Failed to create campaign",
      errors: convertToSerializableError(createCampaignError),
      user: prevState.user,
    };
  }
}
