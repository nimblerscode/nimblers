import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { v4 as uuidv4 } from "uuid";
import type {
  NewOrganization,
  Organization,
} from "@/domain/tenant/organization/model";
import type { schema } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { organization as organizationTable } from "@/infrastructure/persistence/tenant/sqlite/schema";

export const makeOrgDrizzleAdapter = (
  db: DrizzleSqliteDODatabase<typeof schema>
) => ({
  createOrg: async (data: NewOrganization, creatorUserId: string) => {
    console.log("createOrg from drizzleAdapter", data, creatorUserId);
    const id = uuidv4();
    const orgInsertData = {
      id,
      name: data.name,
      slug: data.slug,
      logo: data.logo,
    };
    const orgResults = await db
      .insert(organizationTable)
      .values(orgInsertData)
      .returning();

    if (!orgResults || orgResults.length === 0) {
      throw new Error("Insert returned no results");
    }

    const dbOrg = {
      ...orgResults[0],
    } as unknown as Organization;
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
