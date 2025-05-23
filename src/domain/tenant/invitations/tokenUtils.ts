// libs/auth/invite-token.ts
import { env } from "cloudflare:workers";
import { Context, Effect, Layer, Schema } from "effect";
import { jwtVerify, SignJWT } from "jose";
import type { InvitationId } from "./models";

// Create a TextEncoder for the secret
const encoder = new TextEncoder();

// Create the key using a Uint8Array instead of CryptoKey
const getSecretKey = (secret: string) => encoder.encode(secret);

// Placeholder for generic Org DB errors
export class ErrorToken extends Schema.TaggedError<ErrorToken>()(
  "ErrorToken",
  { cause: Schema.Unknown } // Store the original cause
) {}

export class InviteToken extends Context.Tag("core/token")<
  InviteToken,
  {
    sign: (claims: {
      invitationId: InvitationId;
      doId: string;
    }) => Effect.Effect<string, ErrorToken>;
    verify: (
      token: string
    ) => Effect.Effect<
      { doId: string; invitationId: InvitationId },
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
            console.log("signing token with claims", { doId, invitationId });
            // Use the secretKey directly (Uint8Array)
            const token = await new SignJWT({ doId, invitationId })
              .setProtectedHeader({ alg: "HS256" })
              .setExpirationTime("7d")
              .sign(secretKey);

            console.log("token signed successfully");
            return token;
          },
          catch: (error) => {
            console.error("error signing token", error);
            return new ErrorToken({ cause: error });
          },
        }),

      verify: (token) =>
        Effect.tryPromise({
          try: async () => {
            const { payload } = await jwtVerify<{
              doId: string;
              invitationId: InvitationId;
            }>(token, secretKey);

            console.log("payload from token verification", payload);
            return {
              doId: payload.doId,
              invitationId: payload.invitationId,
            };
          },
          catch: (error) => {
            console.error("error verifying token", error);
            return new ErrorToken({ cause: error });
          },
        }),
    };
  })
);
