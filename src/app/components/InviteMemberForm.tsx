"use client";

import { useState } from "react";

interface InviteMemberFormProps {
  inviterId: string;
  organizationId: string;
}

function InviteMemberForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member"); // Default role
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { inviterId, organizationId } = {
    inviterId: "123",
    organizationId: "456",
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (!email || !role) {
      setMessage({
        type: "error",
        text: "Please enter an email address and select a role.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/organization/invite", {
        // Relative path works as it's same origin
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Auth headers (like cookies) are usually sent automatically by the browser
        },
        body: JSON.stringify({
          email,
          role,
          organizationId, // Passed via props
          inviterId, // Passed via props
        }),
      });

      const result = (await response.json()) as { error?: string }; // Type assertion

      if (response.ok && response.status === 201) {
        setMessage({
          type: "success",
          text: `Invitation sent successfully to ${email}!`,
        });
        setEmail(""); // Clear form on success
        setRole("member");
      } else {
        // Use the potentially typed error message
        setMessage({
          type: "error",
          text: `Error: ${result?.error || response.statusText}`,
        });
      }
    } catch (error) {
      console.error("Failed to send invitation:", error);
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {message && (
        <p style={{ color: message.type === "error" ? "red" : "green" }}>
          {message.text}
        </p>
      )}
      <div>
        <label htmlFor="invite-email">Email:</label>
        <input
          type="email"
          id="invite-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="invite-role">Role:</label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          disabled={isLoading}
        >
          {/* Add other roles as needed */}
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          {/* <option value="owner">Owner</option>  Typically owner is the creator */}
        </select>
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Sending..." : "Send Invitation"}
      </button>
    </form>
  );
}

export default InviteMemberForm;
