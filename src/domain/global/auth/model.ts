import { Schema as S } from "effect";
import { UserIdSchema } from "../user/model";

// Account Schema (mirrors accounts table)
export const AccountSchema = S.Struct({
  id: S.UUID,
  userId: UserIdSchema,
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

export type Account = S.Schema.Type<typeof AccountSchema>;
