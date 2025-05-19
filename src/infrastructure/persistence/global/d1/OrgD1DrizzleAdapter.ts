import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type {
  NewOrganizationD1,
  OrganizationD1,
} from "@/domain/global/organization/model";
import * as schema from "./schema";

export const makeOrgD1DrizzleAdapter = (
  db: DrizzleD1Database<typeof schema>
) => ({
  create: async (organizationData: NewOrganizationD1) => {
    const orgInsertData = {
      id: organizationData.id,
      name: organizationData.name,
      creatorId: organizationData.creatorId,
      status: "active",
    };
    const orgResults = await db
      .insert(schema.organization)
      .values(orgInsertData)
      .returning();

    await db
      .update(schema.session)
      .set({
        activeOrganizationId: orgResults[0].id,
      })
      .where(eq(schema.session.userId, organizationData.creatorId));

    return orgResults[0] as unknown as OrganizationD1;
  },
  getOrgById: async (id: string) => {
    const orgResults = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, id));
    return orgResults[0] as unknown as OrganizationD1;
  },
});
