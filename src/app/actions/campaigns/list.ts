"use server";

import { Data } from "effect";
import { requestInfo } from "rwsdk/worker";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import type { OrganizationSlug } from "@/domain/tenant/shared/branded-types";

// Define Effect-TS branded error types following project patterns
export class AuthenticationError extends Data.TaggedError(
  "AuthenticationError"
)<{
  readonly message: string;
  readonly code?: string;
}> {}

export class CampaignListError extends Data.TaggedError("CampaignListError")<{
  readonly message: string;
  readonly code?: string;
  readonly cause?: unknown;
}> {}

// Union type for all possible errors
type ListCampaignsError = AuthenticationError | CampaignListError;

// Serializable error information
export interface SerializableError {
  type: string;
  message: string;
  code?: string;
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

export interface ListCampaignsResult {
  campaigns: SerializableCampaign[];
  hasMore: boolean;
  cursor: string | null;
}

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

const convertToSerializableError = (
  error: ListCampaignsError
): SerializableError => {
  switch (error._tag) {
    case "AuthenticationError":
      return {
        type: "AuthenticationError",
        message: error.message,
        code: error.code,
      };
    case "CampaignListError":
      return {
        type: "CampaignListError",
        message: error.message,
        code: error.code,
      };
  }
};

export async function listCampaignsAction(
  organizationSlug: OrganizationSlug,
  options?: {
    limit?: number;
    cursor?: string;
    status?: string;
  }
): Promise<ListCampaignsResult> {
  try {
    // Get user context
    const { ctx } = requestInfo;
    const appCtx = ctx as AppContext;

    // Validate user authentication
    validateUser(appCtx.user);

    // Try to list campaigns using direct DO API call
    try {
      const { env } = await import("cloudflare:workers");
      const doId = env.ORG_DO.idFromName(organizationSlug);
      const stub = env.ORG_DO.get(doId);

      const queryParams = new URLSearchParams();
      if (options?.limit) queryParams.set("limit", options.limit.toString());
      if (options?.cursor) queryParams.set("cursor", options.cursor);
      if (options?.status) queryParams.set("status", options.status);

      const url = `http://internal/campaigns${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;

      const response = await stub.fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new CampaignListError({
          message: `Failed to list campaigns: ${response.statusText}`,
          code: "CAMPAIGN_LIST_FAILED",
        });
      }

      const result = (await response.json()) as {
        campaigns: Array<{
          id: string;
          name: string;
          description?: string;
          campaignType: string;
          status: string;
          timezone: string;
          segmentIds: string[];
          createdAt: string;
          updatedAt: string;
        }>;
        hasMore: boolean;
        cursor: string | null;
      };

      return {
        campaigns: result.campaigns,
        hasMore: result.hasMore,
        cursor: result.cursor,
      };
    } catch (error) {
      // Fallback to empty list for now if DO call fails
      return {
        campaigns: [],
        hasMore: false,
        cursor: null,
      };
    }
  } catch (error) {
    const listCampaignsError = error as ListCampaignsError;
    throw new CampaignListError({
      message: listCampaignsError.message || "Failed to list campaigns",
      code: "UNKNOWN_ERROR",
      cause: error,
    });
  }
}
