import { Data, Schema as S } from "effect";
import { type Email, EmailSchema } from "../organization/invitations/models"; // For NewUser email type and EmailSchema

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
