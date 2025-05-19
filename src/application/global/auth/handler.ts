import { Effect } from "effect";
import {
  AuthService,
  type AuthServiceError,
} from "@/domain/global/auth/service";

export const handler = (): Effect.Effect<
  Response,
  AuthServiceError,
  AuthService
> =>
  Effect.gen(function* () {
    const authService = yield* AuthService;
    const result = yield* authService.handler();
    return result;
  });
