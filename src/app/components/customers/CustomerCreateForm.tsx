"use client";

import { useActionState } from "react";
import {
  Banner,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TextField,
  VStack,
  HStack,
} from "@/app/design-system";
import { createCustomerAction, type CreateCustomerState } from "@/app/actions/customers/create";

interface CustomerCreateFormProps {
  organizationSlug: string;
}

const initialState: CreateCustomerState = {
  success: false,
  message: "",
  errors: null,
};

export function CustomerCreateForm({ organizationSlug }: CustomerCreateFormProps) {
  const [state, formAction, pending] = useActionState(createCustomerAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Customer</CardTitle>
      </CardHeader>

      <CardContent>
        <form action={formAction}>
          <VStack gap="6" alignItems="stretch">
            {/* Hidden field for organization slug */}
            <input type="hidden" name="organizationSlug" value={organizationSlug} />

            {/* Success Message */}
            {state.success && (
              <Banner variant="success" icon={true}>
                {state.message}
              </Banner>
            )}

            {/* Error Message */}
            {state.errors && !state.success && (
              <Banner variant="danger" icon={true} title="Customer Creation Failed">
                {state.message || "Failed to create customer. Please try again."}
              </Banner>
            )}

            {/* Email Field */}
            <TextField
              name="email"
              label="Email Address"
              inputProps={{
                type: "email",
                placeholder: "customer@example.com",
                required: true,
                disabled: pending,
                variantSize: "lg",
              }}
              description="Customer's primary email address"
            />

            {/* Name Fields */}
            <HStack gap="4" alignItems="stretch">
              <TextField
                name="firstName"
                label="First Name"
                inputProps={{
                  placeholder: "John",
                  disabled: pending,
                  variantSize: "lg",
                }}
              />
              <TextField
                name="lastName"
                label="Last Name"
                inputProps={{
                  placeholder: "Doe",
                  disabled: pending,
                  variantSize: "lg",
                }}
              />
            </HStack>

            {/* Phone Field */}
            <TextField
              name="phone"
              label="Phone Number"
              inputProps={{
                type: "tel",
                placeholder: "+1 (555) 123-4567",
                disabled: pending,
                variantSize: "lg",
              }}
              description="Customer's phone number for SMS marketing"
            />

            {/* Tags Field */}
            <TextField
              name="tags"
              label="Tags"
              inputProps={{
                placeholder: "vip, loyal, new (comma-separated)",
                disabled: pending,
                variantSize: "lg",
              }}
              description="Separate multiple tags with commas"
            />

            {/* Marketing Preferences */}
            <VStack gap="3" alignItems="stretch">
              <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>
                Marketing Preferences
              </span>

              <VStack gap="2" alignItems="flex-start">
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    name="optInEmail"
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span style={{ fontSize: "0.875rem" }}>
                    Email marketing
                  </span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    name="optInSMS"
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span style={{ fontSize: "0.875rem" }}>
                    SMS marketing
                  </span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    name="optInWhatsApp"
                    style={{ width: "16px", height: "16px" }}
                  />
                  <span style={{ fontSize: "0.875rem" }}>
                    WhatsApp marketing
                  </span>
                </label>
              </VStack>
            </VStack>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isDisabled={pending}
            >
              {pending ? "Adding Customer..." : "Add Customer"}
            </Button>
          </VStack>
        </form>
      </CardContent>
    </Card>
  );
} 
