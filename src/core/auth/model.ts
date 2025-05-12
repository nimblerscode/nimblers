import { Schema as S } from "effect";
import { EmailSchema } from "../organization/invitations/models";

// Basic User Schema - Updated with Better Auth fields
export const UserSchema = S.Struct({
  id: S.UUID,
  email: EmailSchema,
  name: S.Union(S.String, S.Null),
  emailVerified: S.Boolean,
  image: S.Union(S.String, S.Null),
  role: S.Union(S.String, S.Null),
  createdAt: S.Date,
  updatedAt: S.Date,
});

// Account Schema (mirrors accounts table)
export const AccountSchema = S.Struct({
  id: S.UUID,
  userId: UserSchema.fields.id,
  accountId: S.String,
  providerId: S.String,
  accessToken: S.Union(S.String, S.Null),
  refreshToken: S.Union(S.String, S.Null),
  accessTokenExpiresAt: S.Union(S.Date, S.Null),
  refreshTokenExpiresAt: S.Union(S.Date, S.Null),
  scope: S.Union(S.String, S.Null),
  idToken: S.Union(S.String, S.Null),
  password: S.Union(S.String, S.Null),
  createdAt: S.Date,
  updatedAt: S.Date,
});

// Schemas for Passwordless Challenge
export const ChallengePayloadSchema = S.Struct({
  challenge: S.String.pipe(S.brand("Challenge")),
  userId: S.optional(UserSchema.fields.id),
});

export type Account = S.Schema.Type<typeof AccountSchema>;

export type User = S.Schema.Type<typeof UserSchema>;

export type ChallengePayload = S.Schema.Type<typeof ChallengePayloadSchema>;
