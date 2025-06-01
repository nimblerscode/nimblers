import { eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Schema } from "effect";
import { v4 as uuidv4 } from "uuid";
import type {
  NewOrganization,
  Organization,
} from "@/domain/tenant/organization/model";
import type { schema } from "@/infrastructure/persistence/tenant/sqlite/drizzle";
import { organization as organizationTable } from "@/infrastructure/persistence/tenant/sqlite/schema";

// Define the error type with Effect-TS patterns
export class OrganizationNotFoundError extends Schema.TaggedError<OrganizationNotFoundError>()(
  "OrganizationNotFoundError",
  {
    slug: Schema.String,
    message: Schema.optional(Schema.String),
  },
) {}

export const makeOrgDrizzleAdapter = (
  db: DrizzleSqliteDODatabase<typeof schema>,
) => ({
  getOrgBySlug: async (slug: string) => {
    const orgResults = await db
      .select()
      .from(organizationTable)
      .where(eq(organizationTable.slug, slug));

    if (!orgResults || orgResults.length === 0) {
      throw new OrganizationNotFoundError({
        slug,
        message: `Organization with slug '${slug}' not found`,
      });
    }

    return orgResults[0] as unknown as Organization;
  },
  createOrg: async (data: NewOrganization, creatorUserId: string) => {
    // Use slug as ID to ensure consistency with D1 database and auto-creation scenarios
    const id = data.slug;
    const orgInsertData = {
      id,
      name: data.name,
      slug: data.slug,
      logo: data.logo,
      createdAt: new Date(),
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
