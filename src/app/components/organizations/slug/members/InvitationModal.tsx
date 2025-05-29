"use client";

import { UserPlus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import {
  type InviteUserState,
  inviteUserAction,
  type SerializableInvitation,
} from "@/app/actions/invitations/create";
import { Banner } from "@/app/design-system/Banner";
import { Button } from "@/app/design-system/Button";
import { Dialog, DialogFooter } from "@/app/design-system/Dialog";
import { Heading } from "@/app/design-system/Heading";
import { Icon } from "@/app/design-system/Icon";
import { TextFieldRoot as TextField } from "@/app/design-system/Input";
import { Box, Flex, HStack, VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import type { User } from "@/domain/global/user/model";

// Role options for the select
const roleOptions = [
  { id: "admin", label: "Admin", description: "Full access to all features" },
  { id: "editor", label: "Editor", description: "Can edit and manage content" },
  { id: "viewer", label: "Viewer", description: "Read-only access" },
  { id: "member", label: "Member", description: "Standard team member access" },
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

// Internal component that manages the form state
function InvitationModalContent({
  slug,
  user,
  onSuccess,
  onClose,
  onSendAnother,
  close,
}: {
  slug: string;
  user: User;
  onSuccess?: (invitation: SerializableInvitation) => void;
  onClose?: () => void;
  onSendAnother: () => void;
  close: () => void;
}) {
  const initialState: InviteUserState = {
    success: false,
    message: "",
    errors: null,
    user: user,
  };

  const [state, formAction, pending] = useActionState(
    inviteUserAction,
    initialState,
  );

  // Handle successful invitation
  useEffect(() => {
    if (state.success && onSuccess && "invitation" in state) {
      onSuccess(state.invitation);
    }
  }, [state.success, onSuccess, state]);

  const handleClose = () => {
    onClose?.();
    close();
  };

  const handleSendAnother = () => {
    onSendAnother();
  };

  // Success Screen
  if (state.success) {
    return (
      <VStack gap="8" alignItems="stretch" p="8">
        {/* Success Header */}
        <VStack gap="4" alignItems="center">
          <Box
            w="16"
            h="16"
            bg="status.success.background"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            borderWidth="2px"
            borderColor="status.success.border"
          >
            <Icon
              icon={UserPlus}
              css={{ color: "status.success.icon" }}
              w="8"
              h="8"
            />
          </Box>

          <VStack gap="2" alignItems="center">
            <Heading as="h2" levelStyle="h3" textAlign="center">
              Invitation Sent!
            </Heading>
            <Text textAlign="center" color="content.secondary">
              {state.invitation?.email} will receive an email with instructions
              to join your team
            </Text>
          </VStack>
        </VStack>

        {/* Clean Success Summary */}
        <VStack gap="6" alignItems="stretch">
          {/* Invitation Summary - Simplified */}
          {state.success && (
            <Box
              bg="status.success.background"
              borderRadius="lg"
              p="4"
              borderWidth="1px"
              borderColor="status.success.border"
            >
              <HStack
                gap="4"
                alignItems="center"
                justifyContent="space-between"
              >
                <VStack gap="1" alignItems="flex-start">
                  <Text fontSize="sm" color="content.secondary">
                    Invitation sent to
                  </Text>
                  <Text
                    fontSize="md"
                    fontWeight="semibold"
                    color="content.primary"
                    fontFamily="mono"
                  >
                    {state.invitation?.email}
                  </Text>
                </VStack>
                <Box
                  fontSize="sm"
                  fontWeight="medium"
                  textTransform="capitalize"
                  bg="brand.solid"
                  color="brand.onSolid"
                  px="3"
                  py="1.5"
                  borderRadius="md"
                >
                  {state.invitation?.role}
                </Box>
              </HStack>
            </Box>
          )}

          {/* Next Steps - Simplified */}
          <VStack gap="3" alignItems="stretch">
            <Text fontSize="sm" color="content.secondary" textAlign="center">
              They'll receive an email with instructions to join your team
            </Text>
          </VStack>
        </VStack>

        {/* Action Buttons */}
        <Flex gap="3" justifyContent="flex-end">
          <Button variant="outline" onPress={handleSendAnother} type="button">
            Send Another Invitation
          </Button>
          <Button variant="primary" onPress={handleClose} type="button">
            Done
          </Button>
        </Flex>
      </VStack>
    );
  }

  // Form Screen
  return (
    <form action={formAction}>
      <VStack gap="8" alignItems="stretch" p="8">
        {/* Form Header */}
        <VStack gap="3" alignItems="center">
          <Box
            w="12"
            h="12"
            bg="brand.background"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            borderWidth="2px"
            borderColor="brand.border"
          >
            <Icon icon={UserPlus} css={{ color: "brand.solid" }} w="6" h="6" />
          </Box>

          <VStack gap="1" alignItems="center">
            <Heading as="h2" levelStyle="h4" textAlign="center">
              Invite Team Member
            </Heading>
            <Text textAlign="center" color="content.secondary">
              Send an invitation to join {slug}
            </Text>
          </VStack>
        </VStack>

        {/* Form Fields */}
        <VStack gap="6" alignItems="stretch">
          {/* Email Field */}
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
          <VStack gap="3" alignItems="stretch">
            <Text fontSize="sm" fontWeight="medium" color="content.primary">
              Role{" "}
              <span style={{ color: "token(colors.status.danger.solid)" }}>
                *
              </span>
            </Text>
            <Box>
              <select
                name="role"
                defaultValue="member"
                disabled={pending}
                style={{
                  display: "flex",
                  height: "2.5rem",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: "0.25rem",
                  borderWidth: "1px",
                  borderColor: "token(colors.border.default)",
                  backgroundColor: "token(colors.surface.base)",
                  paddingLeft: "0.75rem",
                  paddingRight: "0.75rem",
                  paddingTop: "0.5rem",
                  paddingBottom: "0.5rem",
                  fontSize: "0.875rem",
                  color: "token(colors.content.primary)",
                }}
              >
                {roleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </Box>
          </VStack>

          {/* Organization Slug Hidden Field */}
          <input type="hidden" name="organizationSlug" value={slug} />

          {/* Info Banner */}
          <Banner variant="info" icon={true}>
            The invited user will receive an email with instructions to join
            your organization. They can accept or decline the invitation.
          </Banner>

          {/* Error Message */}
          {state.errors && !state.success && (
            <Banner variant="error" icon={true} title="Invitation Failed">
              {state.message || "Failed to send invitation. Please try again."}
            </Banner>
          )}
        </VStack>

        {/* Footer */}
        <DialogFooter>
          <Button
            variant="secondary"
            onPress={handleClose}
            isDisabled={pending}
            type="button"
          >
            Cancel
          </Button>
          <Button variant="primary" isDisabled={pending} type="submit">
            {pending ? "Sending Invitation..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </VStack>
    </form>
  );
}

export function InvitationModal({
  slug,
  user,
  trigger,
  onSuccess,
  onClose,
}: InvitationModalProps) {
  const [contentKey, setContentKey] = useState(0);

  const handleSendAnother = () => {
    // Reset the content component to clear all state
    setContentKey((prev) => prev + 1);
  };

  // Defensive check for user
  if (!user || !user.id) {
    return (
      <Dialog
        trigger={
          trigger || (
            <Button>
              <HStack gap="2" alignItems="center">
                <Icon icon={UserPlus} />
                Invite Member
              </HStack>
            </Button>
          )
        }
        title="Authentication Required"
        size="md"
        showCloseButton={true}
      >
        {(close: () => void) => (
          <VStack gap="6" alignItems="stretch" p="6">
            <Banner variant="error" icon={true} title="Authentication Error">
              User authentication required. Please refresh the page and try
              again.
            </Banner>
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

  return (
    <Dialog
      trigger={
        trigger || (
          <Button>
            <HStack gap="2" alignItems="center">
              <Icon icon={UserPlus} />
              Invite Member
            </HStack>
          </Button>
        )
      }
      title={`Invite to ${slug}`}
      size="lg"
      showCloseButton={true}
    >
      {(close: () => void) => {
        // Track modal open state
        if (contentKey === 0) {
          setContentKey(1);
        }

        return (
          <InvitationModalContent
            key={contentKey}
            slug={slug}
            user={user}
            onSuccess={onSuccess}
            onClose={onClose}
            onSendAnother={handleSendAnother}
            close={close}
          />
        );
      }}
    </Dialog>
  );
}
