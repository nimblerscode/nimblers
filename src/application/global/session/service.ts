import { Effect, Layer } from "effect";
import { SessionRepo, SessionUseCase } from "@/domain/global/session/service";
import type { UserId } from "@/domain/global/user/model";
import type { OrganizationId } from "@/domain/shopify/store/models";

export const SessionUseCaseLive = Layer.effect(
  SessionUseCase,
  Effect.gen(function* () {
    const sessionRepo = yield* SessionRepo;

    return {
      getActiveOrganization: (userId: UserId) => {
        return Effect.gen(function* () {
          const activeOrganizationId =
            yield* sessionRepo.getActiveOrganizationId(userId);
          return activeOrganizationId;
        }).pipe(Effect.withSpan("SessionUseCase.getActiveOrganization"));
      },

      switchActiveOrganization: (
        userId: UserId,
        organizationId: OrganizationId,
      ) => {
        return Effect.gen(function* () {
          yield* sessionRepo.updateActiveOrganizationId(userId, organizationId);
        }).pipe(Effect.withSpan("SessionUseCase.switchActiveOrganization"));
      },
    };
  }),
);
