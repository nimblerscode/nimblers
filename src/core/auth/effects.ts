import type { User as BetterAuthUser, Session } from "better-auth";
import { Effect } from "effect";
import { AuthService, type AuthServiceError } from "./service";

export const handler = (): Effect.Effect<
  Response,
  AuthServiceError,
  AuthService
> =>
  Effect.gen(function* (_) {
    const authService = yield* _(AuthService);
    const result = yield* _(authService.handler());
    return result;
  });

export const getSession = (): Effect.Effect<
  { session: Session; user: BetterAuthUser },
  AuthServiceError,
  AuthService
> =>
  Effect.gen(function* (_) {
    const authService = yield* _(AuthService);
    const result = yield* _(authService.getSession());
    return result;
  });
