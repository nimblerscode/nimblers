"use client";

import { useActionState, useEffect } from "react"; // Import useEffect
import {
  type CreateOrganizationActionState,
  createOrganizationAction,
} from "../actions/organization/create"; // Correct relative path and add type import
// Initialize state with the correct type
const initialState: CreateOrganizationActionState = {
  success: false,
  message: "",
  errors: null,
  organization: null,
};

export default function CreateOrganizationForm() {
  const [state, formAction, pending] = useActionState(
    createOrganizationAction,
    initialState,
  );

  // Add useEffect for redirection
  useEffect(() => {
    // Check if the action was successful and we have the new org slug
    if (state.success && state.organization?.slug) {
      const newOrgSlug = state.organization.slug;
      console.log(
        `Organization created successfully. Redirecting to /${newOrgSlug}/manage...`,
      );
      // Perform the redirect using basic browser navigation
      window.location.href = `/${newOrgSlug}/manage`;
      // If you were using a client-side router like Next.js, you might do:
      // import { useRouter } from 'next/navigation';
      // const router = useRouter();
      // router.push(`/${newOrgSlug}/manage`);
    }
    // Dependencies array: run effect when success or slug changes
  }, [state.success, state.organization?.slug]);

  return (
    <form action={formAction}>
      <h2>Create New Organization</h2>
      {state.message && (
        <p style={{ color: state.success ? "green" : "red" }}>
          {state.message}
        </p>
      )}
      {/* Display field-specific errors */}
      {state.errors?.name && (
        <p id="name-error" style={{ color: "red" }}>
          {state.errors.name.join(", ")}
        </p>
      )}
      <label>
        Organization Name:
        <input
          type="text"
          name="name"
          required
          aria-describedby={state.errors?.name ? "name-error" : undefined}
        />
      </label>
      <br />
      {state.errors?.slug && (
        <p id="slug-error" style={{ color: "red" }}>
          {state.errors.slug.join(", ")}
        </p>
      )}
      <label>
        Organization Slug: (Unique identifier, e.g., my-cool-org)
        <input
          type="text"
          name="slug"
          pattern="^[a-z0-9-]+$"
          title="Slug can only contain lowercase letters, numbers, and hyphens."
          required
          aria-describedby={state.errors?.slug ? "slug-error" : undefined}
        />
      </label>
      <br />
      {state.errors?.logo && (
        <p id="logo-error" style={{ color: "red" }}>
          {state.errors.logo.join(", ")}
        </p>
      )}
      <label>
        Logo URL (Optional):
        <input
          type="url"
          name="logo"
          aria-describedby={state.errors?.logo ? "logo-error" : undefined}
        />
      </label>
      <br />
      <button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create Organization"}
      </button>
    </form>
  );
}
