"use client";

import { authClient } from "@/app/lib/authClient";
import { type FormEvent, useState } from "react";

// Initialize the auth client (consider moving this outside if reused)
export default function Login() {
  console.log("Login component rendering...");
  // State for loading and error messages
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Optionally, state for field-specific errors if the API returns them
  // const [fieldErrors, setFieldErrors] = useState<{ email?: string, password?: string }>({});

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    console.log("handleSubmit entered");
    e.preventDefault();
    console.log("handleSubmit preventDefault called");
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
          // Check if response indicates success (better-auth client might not throw for all logical errors)
          // Assuming success if no error is thrown, redirect. Adjust if response has specific success flags.
          console.log("Client-side sign-in successful:"); // Optional logging
          window.location.href = "/create-organization"; // Redirect on success
          setIsPending(false);
        },
        onError: async (error) => {
          console.error("Client-side sign-in error:", error);
          setErrorMessage("Login failed. Please check your credentials.");
          setIsPending(false);
        },
      },
    );
  };

  // Removed the successful login state rendering as redirect handles it

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(e);
      }}
      method="POST"
    >
      {" "}
      {/* Use standard onSubmit */}
      <h2>Login</h2>
      {/* Display general error message */}
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      {/* Removed old state.errors?.form display */}
      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          name="email" // Name attribute is crucial for FormData
          required
          // aria-describedby={fieldErrors.email ? "email-error" : undefined}
          disabled={isPending} // Disable input while pending
        />
        {/* Example: Display field-specific error */}
        {/* {fieldErrors.email && (
          <p id="email-error" style={{ color: 'red' }}>{fieldErrors.email}</p>
        )} */}
        {/* Removed old state.errors?.email display */}
      </div>
      <div>
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          type="password"
          name="password" // Name attribute is crucial for FormData
          required
          // aria-describedby={fieldErrors.password ? "password-error" : undefined}
          disabled={isPending} // Disable input while pending
        />
        {/* Example: Display field-specific error */}
        {/* {fieldErrors.password && (
          <p id="password-error" style={{ color: 'red' }}>{fieldErrors.password}</p>
        )} */}
        {/* Removed old state.errors?.password display */}
      </div>
      <button type="submit" disabled={isPending}>
        {isPending ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
