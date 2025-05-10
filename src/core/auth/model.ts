import { Schema as S } from "effect";

// Basic User Schema - Updated with Better Auth fields
export class User extends S.Class<User>("User")({
  id: S.UUID,
  email: S.String.pipe(S.pattern(/^[^@]+@[^@]+\.[^@]+$/), S.brand("Email")),
  name: S.Union(S.String, S.Null),
  emailVerified: S.Boolean,
  image: S.Union(S.String, S.Null),
  role: S.Union(S.String, S.Null),
  createdAt: S.Date,
  updatedAt: S.Date,
}) {}

// Account Schema (mirrors accounts table)
export class Account extends S.Class<Account>("Account")({
  id: S.UUID,
  userId: User.fields.id,
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
}) {}

// Schemas for Passwordless Challenge
export class ChallengePayload extends S.Class<ChallengePayload>(
  "ChallengePayload",
)({
  challenge: S.String.pipe(S.brand("Challenge")),
  userId: S.optional(User.fields.id),
}) {}
