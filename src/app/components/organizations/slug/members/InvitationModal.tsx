"use client";

import { inviteUserAction, type InviteUserState, type SerializableInvitation } from "@/app/actions/invitations/create";
import { Banner } from "@/app/design-system/Banner";
import { Button } from "@/app/design-system/Button";
import { Card, CardContent } from "@/app/design-system/Card";
import { Dialog, DialogFooter } from "@/app/design-system/Dialog";
import { Heading } from "@/app/design-system/Heading";
import { TextFieldRoot as TextField } from "@/app/design-system/Input";
import { Flex, VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import type { User } from "@/domain/global/user/model";
import { useActionState, useState } from "react";
import { cva } from "../../../../../../styled-system/css";

// Styling for the note section
const noteStyles = cva({
  base: {
    bg: "page.background",
    borderRadius: "sm",
    p: "4",
    borderWidth: "thin",
    borderColor: "border.subtle",
  },
});

// Role options for the select
const roleOptions = [
  { id: "admin", label: "Admin" },
  { id: "editor", label: "Editor" },
  { id: "viewer", label: "Viewer" },
  { id: "member", label: "Member" },
];

export interface InvitationModalProps {
  /** The organization or project slug/name to display in the title */
  slug: string;
  /** The current user */
  user: User;
  /** The trigger element that opens the modal */
  trigger?: React.ReactElement;
  /** Callback when invitation is successfully sent */
  onSuccess?: (invitation: SerializableInvitation) => void;
  /** Callback when modal is closed */
  onClose?: () => void;
}

export function InvitationModal({
  slug,
  user,
  trigger,
  onSuccess,
  onClose,
}: InvitationModalProps) {
  const [resetKey, setResetKey] = useState(0);

  const initialState: InviteUserState = {
    success: false,
    message: "",
    errors: null,
    user: user || ({ id: "unknown", email: "", name: "" } as User), // Fallback user
  };

  const [state, formAction, pending] = useActionState(
    inviteUserAction,
    initialState,
  );

  const handleReset = () => {
    setResetKey(prev => prev + 1);
  };

  // Defensive check for user - after hooks are called
  if (!user || !user.id) {
    console.error("InvitationModal: user prop is required and must have an id");
    return (
      <Dialog
        trigger={trigger || <Button>Invite User</Button>}
        title={`Invite to ${slug}`}
        size="md"
        showCloseButton={true}
      >
        {(close: () => void) => (
          <VStack gap="4" alignItems="stretch">
            <div className="text-sm text-status-danger-text font-medium">
              Error: User authentication required. Please refresh the page and try again.
            </div>
            <DialogFooter>
              <Button variant="primary" onPress={close} type="button">
                Close
              </Button>
            </DialogFooter>
          </VStack>
        )}
      </Dialog>
    );
  }

  // Call onSuccess callback when invitation is sent successfully
  if (state.success && onSuccess && 'invitation' in state) {
    onSuccess(state.invitation);
  }

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog
      key={resetKey}
      trigger={trigger || <Button>Invite User</Button>}
      title={`Invite to ${slug}`}
      size="md"
      showCloseButton={true}
    >
      {(close: () => void) => {
        // Success Screen
        if (state.success) {
          return (
            <VStack gap="6" alignItems="stretch" p="6">
              {/* Success Banner */}
              <Banner variant="success" icon={true} title="Invitation Sent Successfully!">
                The invitation has been sent to{" "}
                <strong>{state.invitation?.email || "the recipient"}</strong> and they'll
                receive an email with instructions to join your organization.
              </Banner>

              {/* Success Details Card */}
              <Card css={{ borderColor: "status.success.border", backgroundColor: "status.success.background" }}>
                <CardContent>
                  <VStack gap="4" alignItems="stretch">
                    {/* What happens next section */}
                    <VStack gap="3" alignItems="stretch">
                      <Heading as="h4" levelStyle="h5">
                        What happens next?
                      </Heading>
                      <VStack gap="2" alignItems="stretch">
                        <Flex alignItems="flex-start" gap="3">
                          <Text css={{ fontSize: "sm", color: "status.success.text", minWidth: "6" }}>
                            1.
                          </Text>
                          <Text css={{ fontSize: "sm", color: "status.success.text" }}>
                            The recipient will receive an email invitation
                          </Text>
                        </Flex>
                        <Flex alignItems="flex-start" gap="3">
                          <Text css={{ fontSize: "sm", color: "status.success.text", minWidth: "6" }}>
                            2.
                          </Text>
                          <Text css={{ fontSize: "sm", color: "status.success.text" }}>
                            They'll click the link to accept and join your organization
                          </Text>
                        </Flex>
                        <Flex alignItems="flex-start" gap="3">
                          <Text css={{ fontSize: "sm", color: "status.success.text", minWidth: "6" }}>
                            3.
                          </Text>
                          <Text css={{ fontSize: "sm", color: "status.success.text" }}>
                            You'll be notified when they join and can manage their permissions
                          </Text>
                        </Flex>
                      </VStack>
                    </VStack>

                    {/* Invitation details */}
                    {state.invitation && (
                      <VStack gap="2" alignItems="stretch">
                        <Heading as="h4" levelStyle="h6">
                          Invitation Details
                        </Heading>
                        <VStack gap="1" alignItems="stretch">
                          <Flex justifyContent="space-between">
                            <Text css={{ fontSize: "sm", color: "status.success.text" }}>
                              Email:
                            </Text>
                            <Text css={{ fontSize: "sm", color: "status.success.text", fontWeight: "medium" }}>
                              {state.invitation.email}
                            </Text>
                          </Flex>
                          <Flex justifyContent="space-between">
                            <Text css={{ fontSize: "sm", color: "status.success.text" }}>
                              Role:
                            </Text>
                            <Text css={{ fontSize: "sm", color: "status.success.text", fontWeight: "medium", textTransform: "capitalize" }}>
                              {state.invitation.role}
                            </Text>
                          </Flex>
                        </VStack>
                      </VStack>
                    )}
                  </VStack>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <Flex gap="3" justifyContent="flex-end">
                <Button
                  variant="secondary"
                  onPress={() => {
                    handleReset();
                  }}
                  type="button"
                >
                  Send Another
                </Button>
                <Button
                  variant="primary"
                  onPress={() => {
                    handleClose();
                    close();
                  }}
                  type="button"
                >
                  Done
                </Button>
              </Flex>
            </VStack>
          );
        }

        // Form Screen
        return (
          <form action={formAction}>
            <VStack gap="6" alignItems="stretch">
              <VStack gap="4" alignItems="stretch">
                {/* Email Address Field */}
                <TextField
                  label="Email Address"
                  isRequired
                  name="email"
                  type="email"
                  isDisabled={pending}
                  autoFocus
                  inputProps={{
                    placeholder: "colleague@example.com",
                  }}
                  isInvalid={!!state.errors && !state.success}
                  errorMessage={
                    state.errors && !state.success ? state.message : undefined
                  }
                />

                {/* Role Selection */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-content-primary mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    id="role"
                    defaultValue="admin"
                    disabled={pending}
                    className="flex h-10 w-full items-center justify-between rounded-sm border border-border-default bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-content-secondary focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Organization Slug Hidden Field */}
                <input type="hidden" name="organizationSlug" value={slug} />

                {/* Note Section */}
                <div className={noteStyles()}>
                  <Text>
                    <strong>Note:</strong> The invited user will receive an email with
                    instructions to join your organization.
                  </Text>
                </div>

                {/* Error Message */}
                {state.errors && !state.success && (
                  <div className="text-sm text-status-danger-text font-medium">
                    {state.message || "Failed to send invitation. Please try again."}
                  </div>
                )}
              </VStack>

              {/* Footer with action buttons */}
              <DialogFooter>
                <Button
                  variant="secondary"
                  onPress={() => {
                    handleClose();
                    close();
                  }}
                  isDisabled={pending}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  isDisabled={pending}
                  type="submit"
                >
                  {pending ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </VStack>
          </form>
        );
      }}
    </Dialog>
  );
}

// Simplified version for basic usage
export interface SimpleInvitationModalProps {
  slug: string;
  user: User;
  trigger?: React.ReactElement;
  onSuccess?: (invitation: SerializableInvitation) => void;
}

export function SimpleInvitationModal({
  slug,
  user,
  trigger,
  onSuccess,
}: SimpleInvitationModalProps) {
  return (
    <InvitationModal
      slug={slug}
      user={user}
      trigger={trigger}
      onSuccess={onSuccess}
    />
  );
} 
