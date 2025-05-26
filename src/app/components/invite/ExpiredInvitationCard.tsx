"use client";
import { Button } from "@/app/design-system/Button";
import { Card, CardContent } from "@/app/design-system/Card";
import { Heading } from "@/app/design-system/Heading";
import { Box, VStack } from "@/app/design-system/Layout";
import { Text } from "@/app/design-system/Text";
import { css } from "../../../../styled-system/css";

interface ExpiredInvitationCardProps {
  organizationName: string;
  expiresAt: Date;
}

export function ExpiredInvitationCard({
  organizationName,
  expiresAt,
}: ExpiredInvitationCardProps) {
  const formattedExpiresAt = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Box
      className={css({
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, var(--colors-orange-50) 0%, var(--colors-yellow-100) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4",
      })}
    >
      <Card
        css={{
          maxWidth: "28rem",
          width: "100%",
          borderWidth: "thin",
          borderColor: "status.warning.border",
          backgroundColor: "white",
          boxShadow: "lg",
        }}
      >
        <CardContent css={{ padding: "8" }}>
          <VStack gap="6" alignItems="center">
            {/* Warning Icon */}
            <Box
              className={css({
                width: "16",
                height: "16",
                backgroundColor: "orange.100",
                borderRadius: "full",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <svg
                className={css({
                  width: "8",
                  height: "8",
                  color: "orange.600",
                })}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="Warning icon"
              >
                <title>Warning</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </Box>

            <VStack gap="3" alignItems="center">
              <Heading
                as="h1"
                levelStyle="h3"
                css={{ textAlign: "center", color: "status.warning.text" }}
              >
                Invitation Expired
              </Heading>
              <Text css={{ textAlign: "center", color: "content.subtle" }}>
                Your invitation to join {organizationName} has expired on{" "}
                {formattedExpiresAt}
              </Text>
            </VStack>

            <VStack gap="3" alignItems="stretch" css={{ width: "100%" }}>
              <Button
                variant="primary"
                onPress={() => {
                  window.location.href = "/";
                }}
              >
                Go to Home
              </Button>
            </VStack>

            <Text
              css={{
                fontSize: "xs",
                color: "content.subtle",
                textAlign: "center",
              }}
            >
              To join {organizationName}, please request a new invitation from
              your team administrator.
            </Text>
          </VStack>
        </CardContent>
      </Card>
    </Box>
  );
}
