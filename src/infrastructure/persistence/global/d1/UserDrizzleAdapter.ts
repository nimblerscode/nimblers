import { eq, inArray } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { Email } from "@/domain/global/email/model";
import type { NewMembership, User, UserId } from "@/domain/global/user/model";
import * as schema from "./schema";
import type { user as userTable } from "./schema";

export const makeUserDrizzleAdapter = (
  db: DrizzleD1Database<typeof schema>,
  user: typeof userTable
) => ({
  findById: async (userId: UserId) => {
    const results = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (results.length === 0) {
      return undefined;
    }
    return results[0] as User;
  },
  findByEmail: async (email: Email) => {
    const results = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (results.length === 0) {
      return undefined;
    }
    return results[0] as User;
  },
  createMemberOrg: async (data: NewMembership) => {
    const results = await db
      .insert(schema.organizationMembership)
      .values({
        userId: data.userId,
        organizationId: data.organizationId,
        role: data.role,
      })
      .returning();
    return results[0];
  },
  getUsers: async (memberIds: UserId[]) => {
    if (memberIds.length === 0) {
      return [];
    }
    const results = await db
      .select()
      .from(user)
      .where(inArray(user.id, memberIds));
    return results as User[];
  },
});
