"use server";

import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { FetchHttpClient } from "@effect/platform";
import { requestInfo } from "rwsdk/worker";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { Tracing } from "@/tracing";
import { createOrganizationDOClient } from "@/infrastructure/cloudflare/durable-objects/organization/api/client";

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
export interface CreateCustomerState {
  success: boolean;
  message: string;
  errors: SerializableError | null;
  user?: { id: any };
  customer?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
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
  const email = formData.get("email") as string;
  const organizationSlug = formData.get("organizationSlug") as string;

  if (!email) {
    throw new ValidationError({
      message: "Email is required",
      code: "MISSING_EMAIL",
      field: "email",
    });
  }

  if (!organizationSlug) {
    throw new ValidationError({
      message: "Organization is required",
      code: "MISSING_ORGANIZATION",
      field: "organizationSlug",
    });
  }

  return {
    email,
    phone: formData.get("phone") as string,
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    optInSMS: formData.get("optInSMS") === "on",
    optInEmail: formData.get("optInEmail") === "on",
    optInWhatsApp: formData.get("optInWhatsApp") === "on",
    tags: formData.get("tags")
      ? (formData.get("tags") as string)
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : undefined,
    organizationSlug,
  };
};

export async function createCustomerAction(
  prevState: CreateCustomerState,
  formData: FormData
): Promise<CreateCustomerState> {
  const program = Effect.gen(function* () {
    // Get user context
    const { ctx } = requestInfo;
    const appCtx = ctx as AppContext;

    // Validate user authentication
    const user = validateUser(appCtx.user);

    // Validate and extract form data
    const {
      email,
      phone,
      firstName,
      lastName,
      optInSMS,
      optInEmail,
      optInWhatsApp,
      tags,
      organizationSlug,
    } = validateFormData(formData);

    // Use the proper Effect-TS pattern like other organization actions
    const createCustomerProgram = Effect.gen(function* () {
      const orgDONamespace = yield* Effect.succeed(env.ORG_DO);
      const doId = orgDONamespace.idFromName(organizationSlug);
      const stub = orgDONamespace.get(doId);
      const client = yield* createOrganizationDOClient(stub);

      const customerData = {
        email,
        phone: phone || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        optInSMS,
        optInEmail,
        optInWhatsApp,
        tags,
        metadata: {},
      };

      // Use the auto-generated client method with perfect type safety!
      const customer = yield* client.organizations.createCustomer({
        payload: customerData,
      });

      return customer;
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.withSpan("create-customer-in-do", {
        attributes: {
          "customer.email": email,
          "organization.slug": organizationSlug,
          "action.type": "create-customer",
        },
      })
    );

    const customer = yield* createCustomerProgram;

    return {
      success: true,
      message: "Customer created successfully!",
      errors: null,
      user: { id: user.id },
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        status: customer.status,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
      },
    };
  }).pipe(
    Effect.provide(Tracing),
    Effect.catchAll((error) =>
      Effect.succeed({
        success: false,
        message: "Failed to create customer. Please try again.",
        errors: convertToSerializableError(error),
        user: { id: "unknown" },
      })
    )
  );

  return Effect.runPromise(program);
}
