"use server";
import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { requestInfo } from "rwsdk/worker";
import { DatabaseLive, MemberDOLive } from "@/config/layers";
import { Tracing } from "@/tracing";
import type { OrganizationSlug } from "@/domain/global/organization/models";
import { OrgD1Service } from "@/domain/global/organization/service";
import type { UserId } from "@/domain/global/user/model";
import { UserRepo } from "@/domain/global/user/service";
import type { Member } from "@/domain/tenant/member/model";
import { MemberDOService } from "@/domain/tenant/member/service";
import type { AppContext } from "@/infrastructure/cloudflare/worker";
import { OrgRepoD1LayerLive } from "@/infrastructure/persistence/global/d1/OrgD1RepoLive";
import { UserRepoLive } from "@/infrastructure/persistence/global/d1/UserRepoAdapter";

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
  const program = Effect.gen(function* () {
    const userRepo = yield* UserRepo;
    const userIds = members.map((member) => member.userId);
    const users = yield* userRepo.getUsers(userIds);

    return members.map((member) => {
      const user = users.find((u: any) => u.id === member.userId);
      return {
        ...member,
        user: user || null,
      };
    });
  });

  const userRepoLayer = UserRepoLive.pipe(
    Layer.provide(DatabaseLive({ DB: env.DB }))
  );

  return Effect.runPromise(program.pipe(Effect.provide(userRepoLayer)));
}

export async function getMembers(organizationSlug: OrganizationSlug) {
  const program = Effect.gen(function* () {
    const slug = yield* Effect.tryPromise({
      try: () => checkIfOrgExists(organizationSlug),
      catch: (e) => {
        return e;
      },
    });

    const members = yield* MemberDOService.pipe(
      Effect.flatMap((service) => service.get(slug)),
      Effect.catchAll((_e) => {
        return Effect.succeed([]);
      }),
      Effect.withSpan("get-members-from-do", {
        attributes: {
          "organization.slug": organizationSlug,
          "action.type": "get-members",
        },
      })
    );

    const users = yield* Effect.promise(() => getUsersFromMembers(members));

    return { members: users };
  }).pipe(
    Effect.withSpan("get-members-action", {
      attributes: {
        "action.type": "get-members",
        "organization.slug": organizationSlug,
      },
    }),
    Effect.provide(MemberDOLive({ ORG_DO: env.ORG_DO }))
  );

  return Effect.runPromise(program.pipe(Effect.provide(Tracing)));
}
