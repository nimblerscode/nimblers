"use server";

import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { FetchHttpClient } from "@effect/platform";
import { requestInfo } from "rwsdk/worker";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import type { SegmentType } from "@/domain/tenant/segments/models";
import { Tracing } from "@/tracing";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";
import { addCustomersToSegmentAction } from "@/app/actions/customers/addToSegment";

// Define error types following project patterns
class ValidationError extends Error {
  constructor(
    public readonly options: {
      message: string;
      code: string;
      field: string;
    }
  ) {
    super(options.message);
    this.name = "ValidationError";
  }
}

// State types for the useActionState hook
export interface CreateSegmentState {
  success: boolean;
  message: string;
  errors: SerializableError | null;
  user?: { id: any };
  segment?: {
    id: string;
    name: string;
    description?: string;
    type: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface SerializableError {
  message: string;
  code?: string;
  field?: string;
  stack?: string;
}

const validateUser = (user: any) => {
  if (!user) {
    throw new ValidationError({
      message: "User not found in context",
      code: "USER_NOT_FOUND",
      field: "user",
    });
  }
  return user;
};

const convertToSerializableError = (error: unknown): SerializableError => {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: error instanceof ValidationError ? error.options.code : undefined,
      field: error instanceof ValidationError ? error.options.field : undefined,
      stack: error.stack,
    };
  }
  return {
    message: String(error),
  };
};

const validateFormData = (formData: FormData) => {
  const name = formData.get("name") as string;
  const type = formData.get("type") as SegmentType;
  const organizationSlug = formData.get("organizationSlug") as string;

  if (!name) {
    throw new ValidationError({
      message: "Segment name is required",
      code: "MISSING_NAME",
      field: "name",
    });
  }

  if (!type) {
    throw new ValidationError({
      message: "Segment type is required",
      code: "MISSING_TYPE",
      field: "type",
    });
  }

  if (!organizationSlug) {
    throw new ValidationError({
      message: "Organization is required",
      code: "MISSING_ORGANIZATION",
      field: "organizationSlug",
    });
  }

  const validSegmentTypes = ["manual", "automatic", "shopify_sync"];
  if (!validSegmentTypes.includes(type)) {
    throw new ValidationError({
      message: "Invalid segment type selected",
      code: "INVALID_SEGMENT_TYPE",
      field: "type",
    });
  }

  // Parse customer IDs if provided
  let customerIds: string[] = [];
  const customerIdsJson = formData.get("customerIds") as string;
  if (customerIdsJson) {
    try {
      customerIds = JSON.parse(customerIdsJson);
      if (!Array.isArray(customerIds)) {
        customerIds = [];
      }
    } catch {
      // Invalid JSON, ignore customer IDs
      customerIds = [];
    }
  }

  return {
    name,
    description: formData.get("description") as string,
    type,
    organizationSlug,
    customerIds,
  };
};

export async function createSegmentAction(
  prevState: CreateSegmentState,
  formData: FormData
): Promise<CreateSegmentState> {
  const program = Effect.gen(function* () {
    // Get user context
    const { ctx } = requestInfo;
    const appCtx = ctx as AppContext;

    // Validate user authentication
    const user = validateUser(appCtx.user);

    // Validate and extract form data
    const { name, description, type, organizationSlug, customerIds } =
      validateFormData(formData);

    // Use the proper Effect-TS pattern like other organization actions
    const createSegmentProgram = Effect.gen(function* () {
      const orgDONamespace = yield* Effect.succeed(env.ORG_DO);
      const doId = orgDONamespace.idFromName(organizationSlug);
      const stub = orgDONamespace.get(doId);
      const client = yield* createOrganizationDOClient(stub);

      const segmentData = {
        name,
        description: description || undefined,
        type,
        query:
          type === "automatic"
            ? { conditions: [], logic: "AND" as const }
            : undefined,
        metadata: {},
      };

      // Use the auto-generated client method with perfect type safety!
      const segment = yield* client.organizations.createSegment({
        payload: segmentData,
      });

      return segment;
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.withSpan("create-segment-in-do", {
        attributes: {
          "segment.name": name,
          "segment.type": type,
          "organization.slug": organizationSlug,
          "action.type": "create-segment",
        },
      })
    );

    const segment = yield* createSegmentProgram;

    // Add customers to segment if provided
    let customerMessage = "";
    if (customerIds.length > 0 && type === "manual") {
      const addCustomersResult = yield* Effect.promise(() =>
        addCustomersToSegmentAction(
          organizationSlug as any,
          segment.id as any,
          customerIds as any
        )
      );

      if (addCustomersResult.success) {
        customerMessage = ` ${addCustomersResult.message}`;
      }
    }

    return {
      success: true,
      message: `Segment created successfully!${customerMessage}`,
      errors: null,
      user: { id: user.id },
      segment: {
        id: segment.id,
        name: segment.name,
        description: segment.description,
        type: segment.type,
        status: segment.status,
        createdAt: segment.createdAt.toISOString(),
        updatedAt: segment.updatedAt.toISOString(),
      },
    };
  }).pipe(
    Effect.provide(Tracing),
    Effect.catchAll((error) =>
      Effect.succeed({
        success: false,
        message: "Failed to create segment. Please try again.",
        errors: convertToSerializableError(error),
        user: { id: "unknown" },
      })
    )
  );

  return Effect.runPromise(program);
}
