"use client";

import { useState } from "react";
import { authClient } from "@/app/lib/authClient";

export default function LogoutButton() {
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    setIsPending(true);
    const response = await authClient.signOut();
    console.log("Logout response:", response);
    if (response.data?.success) {
      window.location.href = "/login";
    } else {
      console.error("Logout failed:", response.error);
    }
    setIsPending(false);
  };

  return (
    <form onSubmit={handleLogout}>
      <button type="submit" disabled={isPending}>
        {isPending ? "Logging out..." : "Logout"}
      </button>
    </form>
  );
}
