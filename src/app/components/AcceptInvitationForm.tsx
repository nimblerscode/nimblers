"use client";

import { useActionState } from "react";
import { handleAcceptInvitation } from "../invitation/accept";

interface AcceptInvitationFormProps {
  token: string;
}

type ActionState = {
  loading?: boolean;
  success?: boolean;
  error?: string;
};

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const [state, action] = useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      try {
        const result = await handleAcceptInvitation(prevState, formData);
        console.log("result", result);
        return { success: true };
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : "Failed to accept invitation",
        };
      }
    },
    { loading: false },
  );

  if (state.success) {
    return (
      <div className="p-4 bg-green-100 rounded-md text-green-800">
        <h2 className="font-bold">Invitation Accepted!</h2>
        <p>Your invitation has been successfully accepted.</p>
      </div>
    );
  }

  return (
    <div>
      <form action={action}>
        <input type="hidden" name="token" value={token} />

        {state.error && (
          <div className="p-4 mb-4 bg-red-100 rounded-md text-red-800">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={state.loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {state.loading ? "Processing..." : "Accept Invitation"}
        </button>
      </form>
    </div>
  );
}
