"use client";

import { useState } from "react";
import {
  type ResendVerificationState,
  resendVerificationEmail,
} from "@/app/actions/auth/resend-verification";
import { Banner } from "@/app/design-system/Banner";
import { Button } from "@/app/design-system/Button";
import { HStack } from "@/app/design-system/Layout";

interface EmailVerificationBannerProps {
  userEmail: string;
}

export function EmailVerificationBanner({
  userEmail,
}: EmailVerificationBannerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<ResendVerificationState | null>(null);

  const handleResendVerification = async () => {
    setIsLoading(true);
    setState(null);

    try {
      const result = await resendVerificationEmail();
      setState(result);
    } catch (_error) {
      setState({
        success: false,
        message: null,
        error: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show success message if verification email was sent
  if (state?.success) {
    return (
      <Banner variant="success" icon={true} title="Verification Email Sent!">
        {state.message}
      </Banner>
    );
  }

  // Show error message if there was an error
  if (state?.error) {
    return (
      <Banner
        variant="error"
        icon={true}
        title="Failed to Send Email"
        actions={
          <Button
            variant="outline"
            size="sm"
            onPress={handleResendVerification}
            isDisabled={isLoading}
          >
            Try Again
          </Button>
        }
      >
        {state.error}
      </Banner>
    );
  }

  // Default banner asking for email verification
  return (
    <Banner
      variant="warning"
      icon={true}
      title="Email Verification Required"
      actions={
        <HStack>
          <Button
            variant="secondary"
            size="sm"
            onPress={handleResendVerification}
            isDisabled={isLoading}
          >
            {isLoading ? "Sending..." : "Resend Email"}
          </Button>
        </HStack>
      }
    >
      Please verify your email address ({userEmail}) to secure your account and
      receive important notifications.
    </Banner>
  );
}
