import { AuthService, AuthServiceError } from "@/core/auth/service";
import { Effect, Layer } from "effect";
import { BetterAuthInstance } from "./betterAuthConfig";

export const createBetterAuthServiceAdapter = (request: Request) => {
  return Layer.scoped(
    AuthService,
    Effect.gen(function* (_) {
      const authInstance = yield* _(BetterAuthInstance);
      const serviceMethods = {
        getSession: () =>
          Effect.tryPromise({
            try: () =>
              authInstance.api.getSession({
                headers: request.headers,
              }),
            catch: (error) =>
              new AuthServiceError({
                message: `Adapter: Failed to fetch session. Original error: ${
                  (error as Error)?.message || String(error)
                }`,
                cause: error,
              }),
          }).pipe(
            Effect.flatMap((sessionData) => {
              if (sessionData === null) {
                return Effect.fail(
                  new AuthServiceError({
                    message: "Adapter: Session not found.",
                  }),
                );
              }
              return Effect.succeed(sessionData);
            }),
          ),
        handler: () =>
          Effect.tryPromise({
            try: () => authInstance.handler(request),
            catch: (error) =>
              new AuthServiceError({
                message: `Adapter: Failed to execute handler. ${
                  (error as Error)?.message || String(error)
                }`,
                cause: error,
              }),
          }),
      };

      return serviceMethods;
    }),
  );
};
