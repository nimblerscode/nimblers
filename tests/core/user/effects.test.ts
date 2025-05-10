import { beforeEach, describe, expect, it, vi } from "@effect/vitest";
import { Effect, Layer } from "effect";
import type { User } from "../../../src/core/auth/model";
import { DbError, UserNotFoundError } from "../../../src/core/auth/service"; // Import specific errors
import { updateProfile } from "../../../src/core/user/effects"; // Adjust path
import {
  type UserProfileUpdateData,
  UserRepo,
} from "../../../src/core/user/service"; // Adjust path

// Mocks for UserRepo
const mockUpdateProfileFn = vi.fn();

const UserRepoTest = Layer.succeed(
  UserRepo,
  UserRepo.of({
    updateUserProfile: mockUpdateProfileFn,
  }),
);

describe("User Core Effects", () => {
  beforeEach(() => {
    mockUpdateProfileFn.mockReset();
  });

  describe("updateProfile effect", () => {
    const userId = "user-to-update-id" as User["id"];
    const updateData: UserProfileUpdateData = {
      name: "New Name",
    };
    const updatedUserMock: User = {
      id: userId,
      name: "New Name",
      email: "user@example.com" as User["email"],
      emailVerified: true,
      image: null,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it.effect(
      "should call UserRepo.updateUserProfile and return the updated user",
      () =>
        Effect.gen(function* (_) {
          mockUpdateProfileFn.mockReturnValue(Effect.succeed(updatedUserMock));

          const result = yield* _(updateProfile(userId, updateData));

          expect(mockUpdateProfileFn).toHaveBeenCalledWith(userId, updateData);
          expect(result).toEqual(updatedUserMock);
        }).pipe(Effect.provide(UserRepoTest)),
    );

    it.effect(
      "should return UserNotFoundError if UserRepo.updateUserProfile fails with it",
      () =>
        Effect.gen(function* (_) {
          const originalError = new UserNotFoundError({ identifier: userId });
          mockUpdateProfileFn.mockReturnValue(Effect.fail(originalError));

          const result = yield* _(
            Effect.either(updateProfile(userId, updateData)),
          );

          expect(mockUpdateProfileFn).toHaveBeenCalledWith(userId, updateData);
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBe(originalError);
          }
        }).pipe(Effect.provide(UserRepoTest)),
    );

    it.effect(
      "should return DbError if UserRepo.updateUserProfile fails with it",
      () =>
        Effect.gen(function* (_) {
          const originalError = new DbError({ cause: "DB update failed" });
          mockUpdateProfileFn.mockReturnValue(Effect.fail(originalError));

          const result = yield* _(
            Effect.either(updateProfile(userId, updateData)),
          );

          expect(mockUpdateProfileFn).toHaveBeenCalledWith(userId, updateData);
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBe(originalError);
          }
        }).pipe(Effect.provide(UserRepoTest)),
    );
  });
});
