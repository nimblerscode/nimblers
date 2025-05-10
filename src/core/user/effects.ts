import type { User } from "@/core/auth/model"; // Re-use User model
import { Effect } from "effect";
import {
  type UserProfileUpdateData,
  UserRepo,
  type UserRepoError,
} from "./service";
import type { UserId } from "./service"; // Import UserId type alias

/**
 * Effect program to update a user's profile.
 * Requires UserRepo in its context.
 *
 * @param userId The ID of the user to update.
 * @param data The profile data to update.
 * @returns Effect yielding the updated User or a UserRepoError.
 */
export const updateProfile = (
  userId: UserId,
  data: UserProfileUpdateData,
): Effect.Effect<User, UserRepoError, UserRepo> =>
  Effect.gen(function* (_) {
    const repo = yield* _(UserRepo);
    const updatedUser = yield* _(repo.updateUserProfile(userId, data));
    return updatedUser;
  });

// Add other user-related effects here (e.g., getProfile)
