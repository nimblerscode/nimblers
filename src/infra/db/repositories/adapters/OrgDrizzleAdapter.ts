import type { OrgCreateData } from "@/core/organization/service";
import { eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { v4 as uuidv4 } from "uuid";
import type { schema } from "../../drizzle/drizzleDO";
import {
  member as memberTable,
  organization as organizationTable,
} from "../../schemas/schema.tenant";

export const makeOrgDrizzleAdapter = (
  db: DrizzleSqliteDODatabase<typeof schema>,
) => ({
  createOrg: async (
    data: Pick<OrgCreateData, "name" | "slug" | "logo">,
    creatorUserId: string,
  ) => {
    const orgId = `org_${uuidv4()}`;
    const orgInsertData = {
      id: orgId,
      name: data.name,
      slug: data.slug,
      logo: data.logo ?? null,
    };
    const orgResults = await db
      .insert(organizationTable)
      .values(orgInsertData)
      .returning();
    if (!orgResults || orgResults.length === 0) return undefined;
    const dbOrg = {
      ...orgResults[0],
    };
    // Return org and memberCreateData for further processing
    return {
      org: dbOrg,
      memberCreateData: {
        id: `mem_${uuidv4()}`,
        userId: creatorUserId,
        organizationId: dbOrg.id,
        role: "owner",
      },
    };
  },
  getOrgById: async (id: string) => {
    const results = await db
      .select()
      .from(organizationTable)
      .where(eq(organizationTable.id, id))
      .limit(1);
    return results[0];
  },
  getOrgByUserId: async (userId: string) => {
    const membership = await db
      .select()
      .from(memberTable)
      .where(eq(memberTable.userId, userId))
      .limit(1);
    if (!membership || membership.length === 0) return undefined;
    const { organizationId } = membership[0];
    const orgResults = await db
      .select()
      .from(organizationTable)
      .where(eq(organizationTable.id, organizationId))
      .limit(1);
    return orgResults[0];
  },
});
