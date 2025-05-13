import { Data, Schema as S } from "effect";
import { type Email, EmailSchema } from "../email/model";

export const UserIdSchema = S.String.pipe(S.brand("UserId"));
export type UserId = S.Schema.Type<typeof UserIdSchema>;

// Basic User Schema - Updated with Better Auth fields
export const UserSchema = S.Struct({
  id: UserIdSchema,
  email: EmailSchema,
  name: S.Union(S.String, S.Null),
  emailVerified: S.Boolean,
  image: S.Union(S.String, S.Null),
  role: S.Union(S.String, S.Null),
  createdAt: S.Date,
  updatedAt: S.Date,
});

export type User = S.Schema.Type<typeof UserSchema>;

// --- NewUser Schema ---
// Data needed to create a new user.
// Assumes hashedPassword will be provided by the use-case layer after hashing.
export const NewUserSchema = S.Struct({
  email: EmailSchema, // Use branded EmailSchema directly
  name: S.String,
  hashedPassword: S.String, // This will be the already hashed password
});

export type NewUser = S.Schema.Type<typeof NewUserSchema>;

// --- User Errors ---
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  message: string;
  identifier: { type: "email"; value: Email } | { type: "id"; value: string };
}> {}

export class UserAlreadyExistsError extends Data.TaggedError(
  "UserAlreadyExistsError",
)<{
  message: string;
  email: Email;
}> {}

export class UserDbError extends Data.TaggedError("UserDbError")<{
  message: string;
  cause?: unknown;
}> {}

export type UserError =
  | UserNotFoundError
  | UserAlreadyExistsError
  | UserDbError;
