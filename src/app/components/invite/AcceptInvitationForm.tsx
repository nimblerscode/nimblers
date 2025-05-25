"use client";

import { useActionState } from "react";
import { Button } from "@/app/design-system/Button";
import { Card, CardContent } from "@/app/design-system/Card";
import { VStack, HStack, Flex, Box, Container } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import { Heading } from "@/app/design-system/Heading";
import { Banner } from "@/app/design-system/Banner";
import { Icon } from "@/app/design-system/Icon";
import { CheckCircle } from "@/app/design-system/icons";
import { handleAcceptInvitation } from "../../invitation/accept";
import { css } from "../../../../styled-system/css";

interface AcceptInvitationFormProps {
  token: string;
  invitation: {
    email: string;
    role: string;
    organizationName: string;
    expiresAt: Date;
  };
}

type ActionState = {
  success?: boolean;
  error?: string;
};

export function AcceptInvitationForm({ token, invitation }: AcceptInvitationFormProps) {
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      try {
        const result = await handleAcceptInvitation(prevState, formData);
        if (result.success) {
          return { success: true };
        }
        return { error: result.error || "Failed to accept invitation" };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Failed to accept invitation",
        };
      }
    },
    {},
  );

  const formattedExpiresAt = invitation.expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Success state - show confirmation and next steps
  if (state.success) {
    return (
      <Box className={css({
        minHeight: "100vh",
        background: "linear-gradient(135deg, var(--colors-blue-50) 0%, var(--colors-indigo-100) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4"
      })}>
        <Card
          css={{
            maxWidth: "28rem",
            width: "100%",
            borderWidth: "thin",
            borderColor: "status.success.border",
            backgroundColor: "white",
            boxShadow: "lg"
          }}
        >
          <CardContent css={{ padding: "8" }}>
            <VStack gap="6" alignItems="center">
              <Icon icon={CheckCircle} size="lg" />

              <VStack gap="2" alignItems="center">
                <Heading as="h1" levelStyle="h3" css={{ textAlign: "center", color: "status.success.text" }}>
                  Welcome to {invitation.organizationName}!
                </Heading>
                <Text css={{ textAlign: "center", color: "content.subtle" }}>
                  Your invitation has been successfully accepted
                </Text>
              </VStack>

              <Banner variant="success" icon={true}>
                You're now part of the team! You can start collaborating right away.
              </Banner>

              <VStack gap="3" alignItems="stretch" css={{ width: "100%" }}>
                <Button
                  variant="primary"
                  onPress={() => {
                    window.location.href = "/organization/overview";
                  }}
                >
                  Go to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onPress={() => window.close()}
                >
                  Close Window
                </Button>
              </VStack>
            </VStack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Main invitation acceptance form
  return (
    <Container>
      <Card
        css={{
          maxWidth: "28rem",
          width: "100%",
          borderWidth: "thin",
          borderColor: "border.default",
          backgroundColor: "white",
          boxShadow: "lg"
        }}
      >
        <CardContent css={{ padding: "8" }}>
          <VStack gap="6" alignItems="stretch">
            {/* Header */}
            <VStack gap="3" alignItems="center">
              <Box className={css({
                width: "12",
                height: "12",
                backgroundColor: "blue.100",
                borderRadius: "full",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              })}>
                <svg
                  className={css({ width: "6", height: "6", color: "blue.600" })}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="Organization icon"
                >
                  <title>Organization</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </Box>

              <VStack gap="1" alignItems="center">
                <Heading as="h1" levelStyle="h3" css={{ textAlign: "center" }}>
                  Join {invitation.organizationName}
                </Heading>
                <Text css={{ textAlign: "center", color: "content.subtle" }}>
                  You've been invited to collaborate
                </Text>
              </VStack>
            </VStack>

            {/* Invitation Details */}
            <Card
              css={{
                backgroundColor: "page.background",
                borderWidth: "thin",
                borderColor: "border.subtle"
              }}
            >
              <CardContent css={{ padding: "4" }}>
                <VStack gap="3">
                  <Heading as="h3" levelStyle="h6" css={{ color: "content.primary" }}>
                    Invitation Details
                  </Heading>

                  <VStack gap="2">
                    <Flex justifyContent="space-between" alignItems="center">
                      <Text css={{ fontSize: "sm", color: "content.subtle" }}>Email:</Text>
                      <Text css={{ fontSize: "sm", fontWeight: "medium" }}>{invitation.email}</Text>
                    </Flex>

                    <Flex justifyContent="space-between" alignItems="center">
                      <Text css={{ fontSize: "sm", color: "content.subtle" }}>Role:</Text>
                      <Box className={css({
                        fontSize: "sm",
                        fontWeight: "medium",
                        textTransform: "capitalize",
                        color: "accent.text",
                        backgroundColor: "accent.background",
                        paddingX: "2",
                        paddingY: "1",
                        borderRadius: "sm"
                      })}>
                        {invitation.role}
                      </Box>
                    </Flex>

                    <Flex justifyContent="space-between" alignItems="center">
                      <Text css={{ fontSize: "sm", color: "content.subtle" }}>Expires:</Text>
                      <Text css={{ fontSize: "sm", fontWeight: "medium" }}>{formattedExpiresAt}</Text>
                    </Flex>
                  </VStack>
                </VStack>
              </CardContent>
            </Card>

            {/* Error Message */}
            {state.error && (
              <Banner variant="danger" icon={true}>
                {state.error}
              </Banner>
            )}

            {/* Accept Form */}
            <form action={action}>
              <input type="hidden" name="token" value={token} />

              <VStack gap="4" alignItems="stretch">
                <Box className={css({ width: "100%" })}>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={isPending}
                    className={css({ width: "100%" })}
                  >
                    {isPending ? (
                      <HStack gap="2" alignItems="center" justifyContent="center">
                        <Box className={css({
                          width: "4",
                          height: "4",
                          border: "2px solid white",
                          borderTopColor: "transparent",
                          borderRadius: "full",
                          animation: "spin 1s linear infinite"
                        })} />
                        <span>Accepting...</span>
                      </HStack>
                    ) : (
                      "Accept Invitation"
                    )}
                  </Button>
                </Box>

                <Text css={{
                  fontSize: "xs",
                  color: "content.subtle",
                  textAlign: "center",
                  lineHeight: "relaxed"
                }}>
                  By accepting this invitation, you agree to join {invitation.organizationName} and
                  collaborate with the team. You can always leave the organization later if needed.
                </Text>
              </VStack>
            </form>

            {/* Help Link */}
            <Text css={{
              fontSize: "xs",
              color: "content.subtle",
              textAlign: "center"
            }}>
              Having trouble? Contact your team administrator for assistance.
            </Text>
          </VStack>
        </CardContent>
      </Card>
    </Container>
  );
} 
