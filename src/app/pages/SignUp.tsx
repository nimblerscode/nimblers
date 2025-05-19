"use client";

import { type FormEvent, useState } from "react";
// Import the better-auth client
import { authClient } from "@/app/lib/authClient";

// Define state for messages/errors
interface SignUpState {
  message: string | null;
  error: string | null;
  isLoading: boolean;
}

export default function SignUp() {
  const [formState, setFormState] = useState<SignUpState>({
    message: null,
    error: null,
    isLoading: false,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormState({ message: null, error: null, isLoading: true });

    // Get data using FormData
    const formData = new FormData(event.target as HTMLFormElement);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Basic client-side validation (optional, Zod could be used here too)
    if (!name || !email || !password) {
      setFormState({
        message: null,
        error: "Please fill in all fields.",
        isLoading: false,
      });
      return;
    }

    try {
      console.log(`Client-side signup attempt for: ${email}`);
      // Call authClient with data from FormData
      await authClient.signUp.email(
        { name, email, password },
        {
          onSuccess: (context) => {
            console.log("authClient.signUp.email success context:", context);
            setFormState({
              isLoading: false,
              error: null,
              // Use context.data which might contain success message or user info
              message:
                context.data?.message ||
                context.data ||
                "Signup successful! Check email for verification.",
            });
            // Optional: Redirect or further actions
            // window.location.href = '/login'; // Example redirect
          },
          onError: (error) => {
            console.log("authClient.signUp.email error:", error);
            // Extract a meaningful error message if possible
            const errorMessage = "An unexpected error occurred during signup.";
            setFormState({
              isLoading: false,
              error: errorMessage,
              message: null,
            });
          },
        },
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      // Catch errors *outside* the authClient call itself (e.g., network issues)
      console.error("handleSubmit catch block error:", error);
      setFormState({
        isLoading: false,
        error: message,
        message: null,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Sign Up</h2>
      {formState.message && (
        <p style={{ color: "green" }}>{formState.message}</p>
      )}
      {formState.error && <p style={{ color: "red" }}>{formState.error}</p>}

      {/* Name Input (Uncontrolled) */}
      <div>
        <label htmlFor="name">Name:</label>
        <input
          id="name"
          type="text"
          name="name"
          required
          disabled={formState.isLoading}
        />
      </div>

      {/* Email Input (Uncontrolled) */}
      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          name="email"
          required
          disabled={formState.isLoading}
        />
      </div>

      {/* Password Input (Uncontrolled) */}
      <div>
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          type="password"
          name="password"
          required
          disabled={formState.isLoading}
        />
      </div>

      <button type="submit" disabled={formState.isLoading}>
        {formState.isLoading ? "Signing up..." : "Sign Up"}
      </button>
    </form>
  );
}
