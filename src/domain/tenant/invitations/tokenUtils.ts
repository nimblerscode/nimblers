import type { InvitationId } from "./models";

// src/core/organization/invitations/tokenUtils.ts
export const generateToken = async (
  invitationId: InvitationId,
  secret: string,
): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(invitationId);

  // Generate a key for HMAC
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret), // Use your secret key
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // Sign the invitation ID
  const signature = await crypto.subtle.sign("HMAC", key, data);

  // Convert the signature to a base64 string
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
};

export const validateToken = async (
  token: string,
  secret: string,
): Promise<InvitationId | null> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signature = new Uint8Array(
    atob(token)
      .split("")
      .map((c) => c.charCodeAt(0)),
  );

  const data = encoder.encode(token); // Use the original data for verification
  const isValid = await crypto.subtle.verify("HMAC", key, signature, data);

  if (!isValid) {
    return null; // Token is invalid
  }

  const decodedPayload = JSON.parse(new TextDecoder().decode(data));
  const { invitationId, exp } = decodedPayload;

  // Check expiration
  if (Date.now() > exp) {
    return null; // Token has expired
  }

  return invitationId; // Return the invitation ID if valid
};
