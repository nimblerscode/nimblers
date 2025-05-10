import type { UserId, UserProfileUpdateData } from "@/core/user/service";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { schema } from "../../drizzle/drizzle";
import type { user as userTable } from "../../schemas/schema";

export const makeUserDrizzleAdapter = (
  db: DrizzleD1Database<typeof schema>,
  user: typeof userTable,
) => ({
  updateUserProfile: async (userId: UserId, data: UserProfileUpdateData) => {
    const dataToSet: Partial<typeof user.$inferInsert> = {};
    if (data.name !== undefined) {
      dataToSet.name = data.name;
    }
    if (Object.keys(dataToSet).length === 1) {
      const fetchResult = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      return fetchResult[0];
    }
    const results = await db
      .update(user)
      .set(dataToSet)
      .where(eq(user.id, userId))
      .returning();
    if (results.length === 0) {
      const checkUser = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      if (checkUser.length === 0) {
        return undefined;
      }

      const finalUser = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      return finalUser[0];
    }
    return results[0];
  },
});
