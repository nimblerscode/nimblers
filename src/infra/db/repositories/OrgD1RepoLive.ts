// Import the DrizzleDOClient Tag and its type from your existing drizzleDO.ts
import { OrganizationD1Schema } from "@/core/organization/model";
import {
  type OrgD1CreateData,
  OrgD1Service,
  OrgDbError,
} from "@/core/organization/service";
import { Schema as S } from "effect";
import { Effect, Layer, pipe } from "effect";
import { organization as organizationTable } from "../schemas/schema";

// Import MemberRepo and its types
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { DrizzleD1Client, type schema } from "../drizzle/drizzle";
import { makeOrgD1DrizzleAdapter } from "./adapters/OrgD1DrizzleAdapter";
import { makeOrgD1EffectAdapter } from "./effect/OrgD1EffectAdapter";

// Database representation of an organization (from Drizzle schema)
type organization = typeof organizationTable.$inferSelect;

// Helper to map generic DB errors to our domain-specific OrgDbError
const mapToOrgDbError = (error: unknown): OrgDbError => {
  console.error("Organization Repository DB Error:", error);
  return new OrgDbError({ cause: error });
};

// Helper to decode a database organization object into our domain model
const decodeOrg = (
  organization: organization,
): Effect.Effect<OrgD1CreateData, OrgDbError> => {
  const dataToDecode = {
    ...organization,
    metadata: undefined,
  };
  return pipe(
    S.decodeUnknown(OrganizationD1Schema)(dataToDecode),
    Effect.mapBoth({
      onFailure: (decodeError) => {
        console.error("Organization Decode Error D1:", decodeError);
        return mapToOrgDbError(decodeError);
      },
      onSuccess: (decodedData: OrgD1CreateData) => decodedData,
    }),
  );
};

const makeD1OrgRepo = (db: DrizzleD1Database<typeof schema>) => ({
  insertOrgToMainDB: (
    org: Pick<OrgD1CreateData, "id" | "name">,
    creatorUserId: string,
  ) =>
    Effect.gen(function* (_) {
      // Insert the org into the main DB
      const orgInsertData = {
        id: org.id,
        name: org.name,
        status: "active",
        creatorId: creatorUserId,
      };

      const orgResults = yield* _(
        Effect.tryPromise({
          try: () =>
            db.insert(organizationTable).values(orgInsertData).returning(),
          catch: mapToOrgDbError,
        }),
      );

      if (orgResults.length === 0) {
        yield* _(Effect.fail(mapToOrgDbError("Insert returned no results")));
      }

      // Decode and return the org
      return yield* _(decodeOrg(orgResults[0]));
    }).pipe(Effect.withSpan("OrgRepo.insertOrgToMainDB")),
});

export const OrgRepoD1Layer = Layer.effect(
  OrgD1Service,
  Effect.map(DrizzleD1Client, (db) =>
    makeOrgD1EffectAdapter(makeOrgD1DrizzleAdapter(db)),
  ),
);
