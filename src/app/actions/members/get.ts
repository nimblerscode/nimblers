"use server";
import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { requestInfo } from "rwsdk/worker";
import { DatabaseLive, MemberDOLive } from "@/config/layers";
import { OrgD1Service } from "@/domain/global/organization/service";
import { UserRepo } from "@/domain/global/user/service";
import type { Member } from "@/domain/tenant/member/model";
import { MemberDOService } from "@/domain/tenant/member/service";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { OrgRepoD1LayerLive } from "@/infrastructure/persistence/global/d1/OrgD1RepoLive";
import { UserRepoLive } from "@/infrastructure/persistence/global/d1/UserRepoAdapter";
import type { UserId } from "@/domain/global/user/model";
import type { OrganizationSlug } from "@/domain/global/organization/models";

function checkIfOrgExists(organizationSlug: OrganizationSlug) {
  const ctx = requestInfo.ctx as AppContext;

  if (!ctx.session || !ctx.session.userId) {
    throw new Error("User not authenticated");
  }

  const userId = ctx.session.userId as UserId;

  const getOrgIdBySlugProgram = OrgD1Service.pipe(
    Effect.flatMap((service) =>
      service.verifyUserOrgMembership(organizationSlug, userId)
    )
  );

  const finalLayer = OrgRepoD1LayerLive.pipe(
    Layer.provide(DatabaseLive({ DB: env.DB }))
  );

  const slug = Effect.runPromise(
    getOrgIdBySlugProgram.pipe(Effect.provide(finalLayer))
  );

  return slug;
}

async function getUsersFromMembers(members: Member[]) {
  const memberIds = members.map((member) => member.userId);

  const getUsersProgram = UserRepo.pipe(
    Effect.flatMap((service) => service.getUsers(memberIds))
  );

  const finalLayer = UserRepoLive.pipe(
    Layer.provide(DatabaseLive({ DB: env.DB }))
  );

  const users = await Effect.runPromise(
    getUsersProgram.pipe(Effect.provide(finalLayer))
  );

  return users;
}

export async function getMembers(organizationSlug: OrganizationSlug) {
  const slug = Effect.tryPromise({
    try: () => checkIfOrgExists(organizationSlug),
    catch: (e) => {
      return e;
    },
  });

  const slugResult = await Effect.runPromise(slug);

  const getMembersProgram = MemberDOService.pipe(
    Effect.flatMap((service) => service.get(slugResult)),
    Effect.catchAll((_e) => {
      return Effect.succeed([]);
    })
  );

  const finalLayer = MemberDOLive({ ORG_DO: env.ORG_DO });

  const runnableEffect = getMembersProgram.pipe(Effect.provide(finalLayer));
  const program = await Effect.runPromise(runnableEffect);

  const users = await getUsersFromMembers(program);

  return { members: users };
}
