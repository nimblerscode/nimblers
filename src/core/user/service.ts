import { Schema as S } from "effect";
import { Context, type Effect } from "effect";

// Re-use User model and basic errors from auth domain
import type { User } from "@/core/auth/model";
import type { DbError, UserNotFoundError } from "@/core/auth/service";

// Type alias from User model for clarity
export type UserId = S.Schema.Type<typeof User.fields.id>;

// === Schemas for User Operations ===

// Define what fields are updatable for a user profile
export const UserProfileUpdateData = S.Struct({
  name: S.optional(S.String.pipe(S.minLength(1))).annotations({
    description: "User's display name",
  }),
  // Add other updatable fields here, e.g., avatarUrl, bio, preferences...
}).annotations({ identifier: "UserProfileUpdateData" });
export type UserProfileUpdateData = S.Schema.Type<typeof UserProfileUpdateData>;

// === Service Ports (Interfaces) ===

// Define the errors specific to UserRepo operations, inheriting common ones
export type UserRepoError = UserNotFoundError | DbError; // Add more specific errors if needed

// Interface for user profile data persistence
export interface UserRepo {
  readonly updateUserProfile: (
    userId: UserId,
    data: UserProfileUpdateData,
  ) => Effect.Effect<User, UserRepoError>; // Returns the updated user
  // Add other methods like getUserProfile, deleteUser etc. if needed
}

// Create the Context Tag for UserRepo
export const UserRepo = Context.GenericTag<UserRepo>("@core/UserRepo");
