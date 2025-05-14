import type {
  NewOrganization,
  Organization,
} from "@/domain/tenant/organization/model";
import type { schema } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { organization as organizationTable } from "@/infrastructure/persistence/tenant/sqlite/schema";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { v4 as uuidv4 } from "uuid";

export const makeOrgDrizzleAdapter = (
  db: DrizzleSqliteDODatabase<typeof schema>,
) => ({
  createOrg: async (data: NewOrganization, creatorUserId: string) => {
    const orgId = uuidv4();
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
    } as unknown as Organization;
    // Return org and memberCreateData for further processing
    return {
      org: dbOrg,
      memberCreateData: {
        id: uuidv4(),
        userId: creatorUserId,
        organizationId: dbOrg.id,
        role: "owner",
      },
    };
  },
});
