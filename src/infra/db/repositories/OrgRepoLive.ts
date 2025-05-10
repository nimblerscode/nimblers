// Import the DrizzleDOClient Tag and its type from your existing drizzleDO.ts
import { OrganizationSchema } from "@/core/organization/model";
import {
  type OrgCreateData,
  OrgDbError,
  OrgNotFoundError,
  OrgService,
} from "@/core/organization/service";
import { eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Schema as S } from "effect";
import { Effect, Layer, pipe } from "effect";
import { v4 as uuidv4 } from "uuid";
import { DrizzleDOClient, type schema } from "../drizzle/drizzleDO";
// Corrected import path for the tenant schema
import {
  member as memberTable,
  organization as organizationTable,
} from "../schemas/schema.tenant";

// Import MemberRepo and its types
import { MemberRepo } from "@/core/member/service";
import { makeOrgDrizzleAdapter } from "./adapters/OrgDrizzleAdapter";
import { makeOrgEffectAdapter } from "./effect/OrgEffectAdapter";

// Database representation of an organization (from Drizzle schema)
type Organization = typeof organizationTable.$inferSelect;

// Helper to map generic DB errors to our domain-specific OrgDbError
const mapToOrgDbError = (error: unknown): OrgDbError => {
  console.error("Organization Repository DB Error:", error);
  return new OrgDbError({ cause: error });
};

// Helper to decode a database organization object into our domain model
const decodeOrg = (
  organization: Organization,
): Effect.Effect<OrgCreateData, OrgDbError> => {
  const dataToDecode = {
    ...organization,
    logo: organization.logo ?? undefined,
    metadata: undefined,
    createdAt:
      typeof organization.createdAt === "string"
        ? new Date(Number(organization.createdAt) * 1000).toISOString()
        : typeof organization.createdAt === "number"
          ? new Date(organization.createdAt * 1000).toISOString()
          : organization.createdAt instanceof Date
            ? organization.createdAt.toISOString()
            : new Date().toISOString(),
  };
  return pipe(
    S.decode(OrganizationSchema)(dataToDecode),
    Effect.mapBoth({
      onFailure: (decodeError) => {
        console.error("Organization Decode DO Error:", decodeError);
        return mapToOrgDbError(decodeError);
      },
      onSuccess: (decodedData): OrgCreateData => decodedData,
    }),
  );
};

// --- Factory for Drizzle Organization Repository ---
export const makeOrgRepo = (
  db: DrizzleSqliteDODatabase<typeof schema>,
  memberRepo: MemberRepo["Type"],
) => ({
  createOrg: (
    data: Pick<OrgCreateData, "name" | "slug" | "logo">,
    creatorUserId: string,
  ) =>
    Effect.gen(function* (_) {
      const orgId = `org_${uuidv4()}`;
      const nowDate = new Date();
      const nowIso = nowDate.toISOString();
      const orgInsertData = {
        id: orgId,
        name: data.name,
        slug: data.slug,
        logo: data.logo ?? null,
        createdAt: nowDate,
      };

      const orgResults = yield* _(
        Effect.tryPromise({
          try: () => {
            const a = db
              .insert(organizationTable)
              .values(orgInsertData)
              .returning();
            return a;
          },
          catch: mapToOrgDbError,
        }),
      );

      if (orgResults.length === 0) {
        yield* _(Effect.fail(mapToOrgDbError("Insert returned no results")));
      }

      const dbOrg = {
        ...orgResults[0],
        createdAt: orgResults[0].createdAt,
      };
      const organization = yield* _(decodeOrg(dbOrg)).pipe(
        Effect.mapError((e) => {
          console.log(dbOrg);
          console.error("Line 88: Organization Decode DO Error:", e);
          return mapToOrgDbError(e);
        }),
      );

      // Now, create the initial member
      const memberCreateData = {
        id: `mem_${uuidv4()}`,
        userId: creatorUserId,
        organizationId: organization.id,
        role: "owner",
        createdAt: nowIso,
      };

      // Use the injected memberRepo to create the member
      // We pipe fail to map MemberDbError to OrgDbError for consistency in this function's error channel
      const createdMemberEffect = memberRepo.createMember(memberCreateData);

      yield* _(
        createdMemberEffect,
        // Ensure error types are compatible or mapped if necessary.
        // mapToOrgDbError expects unknown, MemberDbError is unknown.
        Effect.mapError(mapToOrgDbError),
      );

      // Return the created organization
      return organization;
    }).pipe(Effect.withSpan("OrgRepo.createOrgWithInitialMember")), // Renamed span for clarity

  getOrgById: (id: string) =>
    Effect.gen(function* (_) {
      const results = yield* _(
        Effect.tryPromise({
          try: () =>
            db
              .select()
              .from(organizationTable)
              .where(eq(organizationTable.id, id))
              .limit(1),
          catch: mapToOrgDbError,
        }),
      );

      if (results.length === 0) {
        yield* _(Effect.fail(new OrgNotFoundError({ orgId: id })));
      }
      return yield* _(
        decodeOrg(results[0]).pipe(
          Effect.mapError((e) => {
            console.error("Line 136: Organization Decode DO Error:", e);
            return mapToOrgDbError(e);
          }),
        ),
      );
    }).pipe(Effect.withSpan("OrgRepo.getOrgById")),

  getOrgByUserId: (userId: string) =>
    Effect.gen(function* (_) {
      // 1. Find membership record for the user
      const membership = yield* _(
        Effect.tryPromise({
          try: () =>
            db
              .select()
              .from(memberTable)
              .where(eq(memberTable.userId, userId))
              .limit(1),
          catch: mapToOrgDbError,
        }),
      );
      if (!membership || membership.length === 0) {
        yield* _(Effect.fail(new OrgNotFoundError({ orgId: userId })));
      }
      const { organizationId } = membership[0];
      // 2. Fetch organization by ID
      const orgResults = yield* _(
        Effect.tryPromise({
          try: () =>
            db
              .select()
              .from(organizationTable)
              .where(eq(organizationTable.id, organizationId))
              .limit(1),
          catch: mapToOrgDbError,
        }),
      );
      if (!orgResults || orgResults.length === 0) {
        yield* _(Effect.fail(new OrgNotFoundError({ orgId: organizationId })));
      }
      // 3. Decode and return
      return yield* _(
        decodeOrg(orgResults[0]).pipe(
          Effect.mapError((e) => {
            console.error("Line 181: Organization Decode DO Error:", e);
            return mapToOrgDbError(e);
          }),
        ),
      );
    }).pipe(Effect.withSpan("OrgRepo.getOrgByUserId")),
});

// --- Live Layer ---
export const OrgRepoLiveLayer = Layer.effect(
  OrgService,
  Effect.gen(function* (_) {
    const client = yield* _(DrizzleDOClient);
    const memberRepoService = yield* _(MemberRepo);
    return makeOrgEffectAdapter(
      makeOrgDrizzleAdapter(client.db),
      memberRepoService,
    );
  }),
);
