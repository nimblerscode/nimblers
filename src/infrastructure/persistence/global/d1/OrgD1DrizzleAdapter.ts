import type {
  NewOrganizationD1,
  OrganizationD1,
} from "@/domain/global/organization/model";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";
import { and } from "drizzle-orm";

export const makeOrgD1DrizzleAdapter = (
  db: DrizzleD1Database<typeof schema>
) => ({
  create: async (organizationData: NewOrganizationD1) => {
    const orgInsertData = {
      id: organizationData.id,
      slug: organizationData.slug,
      status: "active",
    };
    const orgResults = await db
      .insert(schema.organization)
      .values(orgInsertData)
      .returning();

    // insert the organization membership
    await db.insert(schema.organizationMembership).values({
      userId: organizationData.creatorId,
      organizationId: orgResults[0].id,
      role: "owner",
    });

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
  getOrgIdBySlug: async (slug: string, userId: string) => {
    const orgResults = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.slug, slug));

    const orgId = orgResults[0].id;

    console.log("slug from drizzle adapter", slug);
    console.log("orgId from drizzle adapter", orgId);
    console.log("userId from drizzle adapter", userId);
    // check if the user authed is in the organization in the organizationMembership table
    const isUserInOrg = await db
      .select()
      .from(schema.organizationMembership)
      .where(
        and(
          eq(schema.organizationMembership.userId, userId),
          eq(schema.organizationMembership.organizationId, orgId)
        )
      );

    if (isUserInOrg.length === 0) {
      throw new Error("User not found in organization");
    }

    return orgResults[0].slug as unknown as string;
  },
});
