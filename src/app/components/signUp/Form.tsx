"use client";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
  HStack,
  Link,
  Text,
  TextField,
  VStack,
} from "@/app/design-system";
import { Banner } from "@/app/design-system/Banner";
import { authClient } from "@/app/lib/authClient";

interface SignUpState {
  message: string | null;
  error: string | null;
  isLoading: boolean;
}

interface InvitationContext {
  token: string | null;
  email: string | null;
  isInvited: boolean;
}

export function SignUpForm() {
  const [formState, setFormState] = useState<SignUpState>({
    message: null,
    error: null,
    isLoading: false,
  });

  const [invitationContext, setInvitationContext] = useState<InvitationContext>(
    {
      token: null,
      email: null,
      isInvited: false,
    },
  );

  // Read URL parameters on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const email = params.get("email");

      if (token && email) {
        setInvitationContext({
          token,
          email,
          isInvited: true,
        });
      }
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormState({ ...formState, isLoading: true, error: null });

    const formData = new FormData(event.target as HTMLFormElement);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await authClient.signUp.email(
        { name, email, password },
        {
          onSuccess: async (context) => {
            setFormState({
              isLoading: false,
              error: null,
              message:
                context.data?.message ||
                context.data ||
                "Account created successfully!",
            });

            // If this is an invitation-based signup, attempt to accept the invitation
            if (invitationContext.isInvited && invitationContext.token) {
              try {
                // Call the invitation acceptance endpoint
                const acceptResponse = await fetch("/api/invitations/accept", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    token: invitationContext.token,
                  }),
                });

                if (acceptResponse.ok) {
                  // Redirect to the profile page after successful invitation acceptance
                  setFormState({
                    isLoading: false,
                    error: null,
                    message:
                      "Account created and invitation accepted! Redirecting to your profile...",
                  });

                  // Wait a moment to show the success message, then redirect
                  setTimeout(() => {
                    window.location.href = "/profile";
                  }, 2000);
                } else {
                  // Account created but invitation acceptance failed
                  setFormState({
                    isLoading: false,
                    error:
                      "Account created successfully, but there was an issue accepting the invitation. Please try accepting it manually.",
                    message: null,
                  });

                  // Still redirect to profile after showing the error
                  setTimeout(() => {
                    window.location.href = "/profile";
                  }, 3000);
                }
              } catch (_invitationError) {
                setFormState({
                  isLoading: false,
                  error:
                    "Account created successfully, but there was an issue accepting the invitation. Please try accepting it manually.",
                  message: null,
                });

                // Still redirect to profile
                setTimeout(() => {
                  window.location.href = "/profile";
                }, 3000);
              }
            } else {
              // Regular signup flow - still redirect to profile for better UX
              setTimeout(() => {
                window.location.href = "/profile";
              }, 1500);
            }
          },
          onError: (error) => {
            setFormState({
              isLoading: false,
              error: error.error.message,
              message: null,
            });
          },
        },
      );
    } catch (_error) {
      setFormState({
        isLoading: false,
        error: "An unexpected error occurred. Please try again.",
        message: null,
      });
    }
  };

  return (
    <Card>
      <VStack gap="6" alignItems="stretch">
        <CardHeader>
          <CardTitle>
            {invitationContext.isInvited
              ? "Complete Your Invitation"
              : "Get Started"}
          </CardTitle>

          {/* Show invitation context banner */}
          {invitationContext.isInvited && (
            <Banner variant="info" icon={true}>
              You've been invited to join an organization. Create your account
              below to accept the invitation.
            </Banner>
          )}

          {formState.message && (
            <Banner variant="success" icon={true}>
              {formState.message}
            </Banner>
          )}

          {formState.error && (
            <Banner variant="danger" icon={true}>
              {formState.error}
            </Banner>
          )}
        </CardHeader>

        <CardContent>
          <VStack gap="8" alignItems="stretch">
            <form onSubmit={handleSubmit}>
              <VStack gap="6" alignItems="stretch">
                <VStack gap="2" alignItems="stretch">
                  <TextField
                    name="name"
                    inputProps={{
                      variantSize: "lg",
                      placeholder: "John Doe",
                      required: true,
                      disabled: formState.isLoading,
                    }}
                    label="Full Name"
                    type="text"
                  />
                  <TextField
                    name="email"
                    inputProps={{
                      variantSize: "lg",
                      placeholder: "john.doe@example.com",
                      required: true,
                      disabled: formState.isLoading,
                      readOnly: invitationContext.isInvited,
                    }}
                    label={
                      invitationContext.isInvited
                        ? "Email (from invitation)"
                        : "Email"
                    }
                    type="email"
                    value={invitationContext.email || undefined}
                    description={
                      invitationContext.isInvited
                        ? "This email address is from your invitation and cannot be changed"
                        : undefined
                    }
                  />
                  <TextField
                    name="password"
                    inputProps={{
                      variantSize: "lg",
                      placeholder: "********",
                      required: true,
                      disabled: formState.isLoading,
                    }}
                    label="Password"
                    type="password"
                  />
                </VStack>
                <Button
                  variant="primary"
                  size="lg"
                  type="submit"
                  isDisabled={formState.isLoading}
                >
                  {formState.isLoading
                    ? "Creating Account..."
                    : invitationContext.isInvited
                      ? "Create Account & Join Organization"
                      : "Sign up with email"}
                </Button>
              </VStack>
            </form>

            {/* Only show alternative signup methods for non-invitation signups */}
            {!invitationContext.isInvited && (
              <>
                <Flex alignItems="center" gap="4">
                  <Box flex="1" height="1px" bg="content.secondary" />
                  <Text
                    color="content.secondary"
                    fontSize="sm"
                    whiteSpace="nowrap"
                  >
                    or
                  </Text>
                  <Box flex="1" height="1px" bg="content.secondary" />
                </Flex>

                <Button
                  variant="outline"
                  size="lg"
                  isDisabled={formState.isLoading}
                >
                  <HStack gap="2" alignItems="center">
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <title>Sign up with Google</title>
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Sign up with Google
                  </HStack>
                </Button>
              </>
            )}

            <VStack gap="2" alignItems="center">
              <Text fontSize="sm" color="page.textSecondary">
                Already have an account?{" "}
                <Link
                  href={
                    invitationContext.isInvited
                      ? `/login?token=${invitationContext.token}&email=${encodeURIComponent(invitationContext.email || "")}`
                      : "/login"
                  }
                >
                  Log in
                </Link>
              </Text>

              {invitationContext.isInvited && (
                <Text
                  fontSize="xs"
                  color="content.subtle"
                  css={{ textAlign: "center" }}
                >
                  By creating an account, you'll automatically join the
                  organization you were invited to.
                </Text>
              )}
            </VStack>
          </VStack>
        </CardContent>
      </VStack>
    </Card>
  );
}
