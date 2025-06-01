import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type {
  NewOrganizationD1,
  OrganizationD1,
  OrganizationWithMembership,
} from "@/domain/global/organization/model";
import type {
  OrganizationSlug,
  OrganizationId,
} from "@/domain/global/organization/models";
import * as schema from "./schema";
import type { UserId } from "@/domain/global/user/model";

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
  getOrgBySlug: async (slug: OrganizationSlug) => {
    const orgResults = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.slug, slug));

    if (!orgResults || orgResults.length === 0) {
      throw new Error(`Organization with slug "${slug}" not found`);
    }

    return orgResults[0] as unknown as OrganizationD1;
  },
  verifyUserOrgMembership: async (slug: OrganizationSlug, userId: UserId) => {
    const orgResults = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.slug, slug));

    // Check if organization exists
    if (!orgResults || orgResults.length === 0) {
      throw new Error(`Organization with slug "${slug}" not found`);
    }

    const orgId = orgResults[0].id;
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

    return orgResults[0].slug as OrganizationSlug;
  },
  getOrganizationsForUser: async (
    userId: UserId
  ): Promise<OrganizationWithMembership[]> => {
    const results = await db
      .select({
        id: schema.organization.id,
        slug: schema.organization.slug,
        status: schema.organization.status,
        role: schema.organizationMembership.role,
        createdAt: schema.organization.createdAt,
      })
      .from(schema.organization)
      .innerJoin(
        schema.organizationMembership,
        eq(schema.organization.id, schema.organizationMembership.organizationId)
      )
      .where(eq(schema.organizationMembership.userId, userId));

    return results.map((result) => ({
      ...result,
      id: result.id as OrganizationId,
      slug: result.slug as OrganizationSlug,
      createdAt: result.createdAt.toISOString(),
    }));
  },
});
