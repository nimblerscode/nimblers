"use client";

import { Card, CardContent } from "@/app/design-system/Card";
import { VStack, Box } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import { Heading } from "@/app/design-system/Heading";
import { Button } from "@/app/design-system/Button";
import { css } from "../../../../styled-system/css";

interface InvalidInvitationCardProps {
  reason: string;
  showLoginLink?: boolean;
}

export function InvalidInvitationCard({ reason, showLoginLink = false }: InvalidInvitationCardProps) {
  return (
    <Box className={css({
      minHeight: "100vh",
      background: "linear-gradient(135deg, var(--colors-red-50) 0%, var(--colors-orange-100) 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4"
    })}>
      <Card css={{
        maxWidth: "28rem",
        width: "100%",
        borderWidth: "thin",
        borderColor: "status.danger.border",
        backgroundColor: "white",
        boxShadow: "lg"
      }}>
        <CardContent css={{ padding: "8" }}>
          <VStack gap="6" alignItems="center">
            {/* Error Icon */}
            <Box className={css({
              width: "16",
              height: "16",
              backgroundColor: "red.100",
              borderRadius: "full",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            })}>
              <svg
                className={css({ width: "8", height: "8", color: "red.600" })}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="Error icon"
              >
                <title>Error</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Box>

            <VStack gap="3" alignItems="center">
              <Heading as="h1" levelStyle="h3" css={{ textAlign: "center", color: "status.danger.text" }}>
                Invalid Invitation
              </Heading>
              <Text css={{ textAlign: "center", color: "content.subtle" }}>
                {reason}
              </Text>
            </VStack>

            <VStack gap="3" alignItems="stretch" css={{ width: "100%" }}>
              {showLoginLink && (
                <Button
                  variant="primary"
                  onPress={() => {
                    window.location.href = "/login";
                  }}
                >
                  Go to Login
                </Button>
              )}
              <Button
                variant="outline"
                onPress={() => {
                  window.location.href = "/";
                }}
              >
                Go to Home
              </Button>
            </VStack>

            <Text css={{
              fontSize: "xs",
              color: "content.subtle",
              textAlign: "center"
            }}>
              If you believe this is an error, please contact your team administrator.
            </Text>
          </VStack>
        </CardContent>
      </Card>
    </Box>
  );
} 
