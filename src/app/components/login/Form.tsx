import { type FormEvent, useState } from "react";
import {
  Banner,
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
import { authClient } from "@/app/lib/authClient";

export function LoginForm({
  token,
  redirect,
  email,
}: {
  token: string | null;
  redirect: string | null;
  email: string | null;
}) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setErrorMessage(null); // Clear previous errors
    // setFieldErrors({}); // Clear field errors

    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    // Use the better-auth client library to sign in
    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => {
          // If the sign-in is successful, better-auth handler should have set the cookie.
          // We can now redirect the user client-side.

          // If there's an invitation token, redirect back to the invitation page
          if (token) {
            window.location.href = `/invite/${token}`;
          } else if (redirect) {
            // Use the redirect URL if provided
            window.location.href = redirect;
          } else {
            // Default redirect for normal login
            window.location.href = "/organization/create";
          }
          setIsPending(false);
        },
        onError: async (error) => {
          setErrorMessage(error.error.message);
          setIsPending(false);
        },
      },
    );
  };
  return (
    <Card>
      <VStack gap="6" alignItems="stretch">
        <CardHeader>
          <VStack gap="2" alignItems="flex-start">
            <CardTitle>Sign in to your account</CardTitle>
            {errorMessage ? (
              <Banner variant="error">
                <Text>{errorMessage}</Text>
              </Banner>
            ) : null}
          </VStack>
        </CardHeader>
        <CardContent>
          <VStack gap="8" alignItems="stretch">
            <form onSubmit={handleSubmit} method="POST">
              <VStack gap="6" alignItems="stretch">
                <VStack gap="2" alignItems="stretch">
                  <TextField
                    name="email"
                    inputProps={{
                      required: true,
                      variantSize: "lg",
                      placeholder: "john.doe@example.com",
                      defaultValue: email || "",
                    }}
                    label="Email"
                    type="email"
                  />
                  <TextField
                    name="password"
                    inputProps={{
                      required: true,
                      variantSize: "lg",
                      placeholder: "********",
                    }}
                    label="Password"
                    type="password"
                  />
                </VStack>
                <Button variant="primary" size="lg" type="submit">
                  {isPending ? "Signing in..." : "Sign in"}
                </Button>
              </VStack>
            </form>
            <Flex alignItems="center" gap="4">
              <Box flex="1" height="1px" bg="border.default" />
              <Text
                color="page.textSecondary"
                fontSize="sm"
                whiteSpace="nowrap"
              >
                or
              </Text>
              <Box flex="1" height="1px" bg="border.default" />
            </Flex>
            <Button variant="outline" size="lg">
              <HStack gap="2" alignItems="center">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <title>Sign in with Google</title>
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
                Sign in with Google
              </HStack>
            </Button>
            <VStack gap="2" alignItems="center">
              <Text fontSize="sm" color="page.textSecondary">
                Don't have an account? <Link href="/signup">Sign up</Link>
              </Text>
            </VStack>
          </VStack>
        </CardContent>
      </VStack>
    </Card>
  );
}
