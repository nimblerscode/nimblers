import {
  AuthService,
  type AuthServiceError,
} from "@/domain/global/auth/service";
import { Effect } from "effect";

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
