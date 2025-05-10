import { Effect } from "effect";
import type { User } from "../auth/model";
import { Organization } from "./model";
import {
  type OrgCreateData,
  type OrgD1CreateData,
  OrgD1Service,
  type OrgDbError,
  type OrgNotFoundError,
  OrgService,
} from "./service";
// Assuming MemberRepo might be needed later for adding the initial owner
// import { MemberRepo } from "./memberService"; // Placeholder

// Type for input, orgId is usually generated, not input here.
// We pick the fields needed for creation from OrgCreateData.
export interface CreateOrgInput
  extends Pick<OrgCreateData, "name" | "slug" | "logo"> {
  userId: string; // ID of the user creating the org
}

/**
 * Effect program to initialize a new organization within its Durable Object.
 * Requires OrgRepo (and potentially MemberRepo) in its context.
 *
 * @param input Data containing org details and the initial user ID.
 * @returns Effect yielding the created Organization or an OrgDbError.
 */
export const createOrg = (input: CreateOrgInput) =>
  Effect.gen(function* (_) {
    const orgService = yield* _(OrgService);
    // const memberRepo = yield* _(MemberRepo); // If needed

    // 1. Create the organization record
    // The input already matches OrgCreateData after picking relevant fields
    const orgCreationData = {
      name: input.name,
      slug: input.slug,
      logo: input.logo,
      // id and createdAt are handled by the repository layer
    };
    const organization = yield* _(
      orgService.createOrg(orgCreationData, input.userId),
    );

    // 2. Initial member creation is handled within orgService.createOrg (OrgRepoLive.ts)

    // 3. Return the created organization
    return organization;
  });

/**
 * Effect program to get an organization by its ID.
 *
 * @param id The ID of the organization to retrieve.
 * @returns Effect yielding the organization or an OrgNotFoundError.
 */
export const getOrgById = (
  id: OrgCreateData["id"],
): Effect.Effect<OrgCreateData, OrgNotFoundError | OrgDbError, OrgService> =>
  Effect.gen(function* (_) {
    const orgService = yield* _(OrgService);
    const org = yield* _(orgService.getOrgById(id));
    return org;
  }).pipe(Effect.withSpan("getOrgById"));

/**
 * Effect program to get an organization by the user's ID.
 *
 * @param userId The ID of the user to retrieve the organization for.
 * @returns Effect yielding the organization or an OrgNotFoundError.
 */
export const getOrgByUserId = (
  userId: User["id"],
): Effect.Effect<OrgCreateData, OrgNotFoundError | OrgDbError, OrgService> =>
  Effect.gen(function* (_) {
    const orgService = yield* _(OrgService);
    const org = yield* _(orgService.getOrgByUserId(userId));
    return org;
  }).pipe(Effect.withSpan("getOrgByUserId"));

/**
 * Effect program to insert an organization into the main database.
 *
 * @param org The organization to insert.
 * @param userId The ID of the user creating the organization.
 * @returns Effect yielding the inserted organization or an OrgDbError.
 */
export const insertOrgToMainDB = (
  org: OrgD1CreateData,
  userId: User["id"],
): Effect.Effect<OrgD1CreateData, OrgDbError, OrgD1Service> =>
  Effect.gen(function* (_) {
    const orgService = yield* _(OrgD1Service);
    return yield* _(orgService.insertOrgToMainDB(org, userId));
  }).pipe(Effect.withSpan("insertOrgToMainDB"));
