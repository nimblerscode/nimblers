"use client";

import { Button } from "@/app/design-system/Button";
import { Card, CardContent } from "@/app/design-system/Card";
import { VStack, Flex, Box, Container } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import { Heading } from "@/app/design-system/Heading";
import { Banner } from "@/app/design-system/Banner";
import { css } from "../../../../styled-system/css";
import { AcceptInvitationForm } from "./AcceptInvitationForm";

interface InvitationLandingPageProps {
  token: string;
  invitation: {
    email: string;
    role: string;
    organizationName: string;
    expiresAt: Date;
  };
  userState: "user_not_exists" | "user_exists_not_logged_in" | "user_logged_in_email_mismatch" | "user_logged_in_email_match";
  currentUser?: any;
}

export function InvitationLandingPage({
  token,
  invitation,
  userState,
  currentUser
}: InvitationLandingPageProps) {
  const formattedExpiresAt = invitation.expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const handleSignup = () => {
    const signupUrl = `/signup?token=${token}&email=${encodeURIComponent(invitation.email)}`;
    window.location.href = signupUrl;
  };

  const handleLogin = () => {
    const loginUrl = `/login?token=${token}&email=${encodeURIComponent(invitation.email)}&redirect=${encodeURIComponent('/organization/overview')}`;
    window.location.href = loginUrl;
  };

  const handleLogout = () => {
    // TODO: Implement proper logout
    window.location.href = '/api/auth/logout';
  };

  // Main invitation page layout
  return (
    <Box className={css({
      minHeight: "100vh",
      background: "linear-gradient(135deg, var(--colors-blue-50) 0%, var(--colors-indigo-100) 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4"
    })}>
      <Container>
        <Card
          css={{
            maxWidth: "32rem",
            width: "100%",
            borderWidth: "thin",
            borderColor: "border.default",
            backgroundColor: "white",
            boxShadow: "lg",
            margin: "0 auto"
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

              {/* User State-specific Actions */}
              {userState === "user_not_exists" && (
                <VStack gap="4" alignItems="stretch">
                  <Banner variant="info" icon={true}>
                    You'll need to create an account to accept this invitation.
                  </Banner>

                  <Button
                    variant="primary"
                    onPress={handleSignup}
                    className={css({ width: "100%" })}
                  >
                    Create Account & Accept Invitation
                  </Button>

                  <Text css={{
                    fontSize: "xs",
                    color: "content.subtle",
                    textAlign: "center",
                    lineHeight: "relaxed"
                  }}>
                    Already have an account? <button
                      type="button"
                      onClick={handleLogin}
                      className={css({
                        color: "accent.text",
                        textDecoration: "underline",
                        background: "none",
                        border: "none",
                        cursor: "pointer"
                      })}
                    >
                      Sign in instead
                    </button>
                  </Text>
                </VStack>
              )}

              {userState === "user_exists_not_logged_in" && (
                <VStack gap="4" alignItems="stretch">
                  <Banner variant="info" icon={true}>
                    Please sign in to your existing account to accept this invitation.
                  </Banner>

                  <Button
                    variant="primary"
                    onPress={handleLogin}
                    className={css({ width: "100%" })}
                  >
                    Sign In & Accept Invitation
                  </Button>

                  <Text css={{
                    fontSize: "xs",
                    color: "content.subtle",
                    textAlign: "center",
                    lineHeight: "relaxed"
                  }}>
                    Don't have an account? <button
                      type="button"
                      onClick={handleSignup}
                      className={css({
                        color: "accent.text",
                        textDecoration: "underline",
                        background: "none",
                        border: "none",
                        cursor: "pointer"
                      })}
                    >
                      Create one instead
                    </button>
                  </Text>
                </VStack>
              )}

              {userState === "user_logged_in_email_mismatch" && (
                <VStack gap="4" alignItems="stretch">
                  <Banner variant="warning" icon={true}>
                    This invitation is for {invitation.email}, but you're logged in as {currentUser?.email}.
                    Please sign out and sign in with the correct email address.
                  </Banner>

                  <VStack gap="2" alignItems="stretch">
                    <Button
                      variant="primary"
                      onPress={handleLogout}
                      className={css({ width: "100%" })}
                    >
                      Sign Out & Switch Account
                    </Button>

                    <Button
                      variant="outline"
                      onPress={() => window.history.back()}
                      className={css({ width: "100%" })}
                    >
                      Go Back
                    </Button>
                  </VStack>
                </VStack>
              )}

              {userState === "user_logged_in_email_match" && (
                <AcceptInvitationForm
                  token={token}
                  invitation={invitation}
                />
              )}

              {/* Help Link */}
              <Text css={{
                fontSize: "xs",
                color: "content.subtle",
                textAlign: "center",
                lineHeight: "relaxed"
              }}>
                Having trouble? <a
                  href="mailto:support@example.com"
                  className={css({
                    color: "accent.text",
                    textDecoration: "underline"
                  })}
                >
                  Contact support
                </a>
              </Text>
            </VStack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
} 
