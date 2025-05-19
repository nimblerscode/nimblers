// libs/auth/invite-token.ts
import { env } from "cloudflare:workers";
import { Context, Effect, Layer } from "effect";
import { SignJWT, jwtVerify } from "jose";
import type { InvitationId } from "./models";
import type { DurableObjectId } from "@cloudflare/workers-types";

// Create a TextEncoder for the secret
const encoder = new TextEncoder();

// Create the key using a Uint8Array instead of CryptoKey
const getSecretKey = (secret: string) => encoder.encode(secret);

export class ErrorToken extends Error {
  readonly _tag = "ErrorToken";
  constructor(readonly message: string) {
    super(message);
  }
}

export class InviteToken extends Context.Tag("core/token")<
  InviteToken,
  {
    sign: (claims: {
      invitationId: InvitationId;
      doId: DurableObjectId;
    }) => Effect.Effect<string, ErrorToken>;
    verify: (
      token: string
    ) => Effect.Effect<
      { doId: DurableObjectId; invitationId: InvitationId },
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
            return new ErrorToken(String(error));
          },
        }),

      verify: (token) =>
        Effect.tryPromise({
          try: async () => {
            const { payload } = await jwtVerify<{
              doId: DurableObjectId;
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
            return new ErrorToken(String(error));
          },
        }),
    };
  })
);
