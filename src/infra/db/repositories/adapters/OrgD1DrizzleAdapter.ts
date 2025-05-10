import type { OrgD1CreateData } from "@/core/organization/service";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { schema } from "../../drizzle/drizzle";

export const makeOrgD1DrizzleAdapter = (
  db: DrizzleD1Database<typeof schema>,
) => ({
  insertOrgToMainDB: async (
    org: Pick<OrgD1CreateData, "id" | "name">,
    creatorUserId: string,
  ) => {
    const orgInsertData = {
      id: org.id,
      name: org.name,
      status: "active",
      creatorId: creatorUserId,
    };
    const orgResults = await db
      .insert(schema.organization)
      .values(orgInsertData)
      .returning();
    return orgResults[0];
  },
});
