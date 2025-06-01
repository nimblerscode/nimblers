// libs/auth/invite-token.ts
import { env } from "cloudflare:workers";
import { Context, Effect, Layer, Schema } from "effect";
import { jwtVerify, SignJWT } from "jose";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import type { InvitationId } from "./models";

// Create a TextEncoder for the secret
const encoder = new TextEncoder();

// Create the key using a Uint8Array instead of CryptoKey
const getSecretKey = (secret: string) => encoder.encode(secret);

// Placeholder for generic Org DB errors
export class ErrorToken extends Schema.TaggedError<ErrorToken>()(
  "ErrorToken",
  { cause: Schema.Unknown }, // Store the original cause
) {}

export class InviteToken extends Context.Tag("core/token")<
  InviteToken,
  {
    sign: (claims: {
      invitationId: InvitationId;
      doId: OrganizationSlug;
    }) => Effect.Effect<string, ErrorToken>;
    verify: (
      token: string,
    ) => Effect.Effect<
      { doId: OrganizationSlug; invitationId: InvitationId },
      ErrorToken
    >;
  }
>() {}

export const InviteTokenLive = Layer.effect(
  InviteToken,
  Effect.gen(function* () {
    // Use the secret directly as a Uint8Array instead of importing as CryptoKey
    const secret = env.SECRET_KEY;
    // Convert to Uint8Array directly
    const secretKey = getSecretKey(secret);

    return {
      sign: ({ doId, invitationId }) =>
        Effect.tryPromise({
          try: async () => {
            // Use the secretKey directly (Uint8Array)
            const token = await new SignJWT({ doId, invitationId })
              .setProtectedHeader({ alg: "HS256" })
              .setExpirationTime("7d")
              .sign(secretKey);
            return token;
          },
          catch: (error) => {
            return new ErrorToken({ cause: error });
          },
        }),

      verify: (token) =>
        Effect.tryPromise({
          try: async () => {
            const { payload } = await jwtVerify<{
              doId: OrganizationSlug;
              invitationId: InvitationId;
            }>(token, secretKey);
            return {
              doId: payload.doId,
              invitationId: payload.invitationId,
            };
          },
          catch: (error) => {
            return new ErrorToken({ cause: error });
          },
        }),
    };
  }),
);
