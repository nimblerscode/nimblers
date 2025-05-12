import { getSession, handler } from "@/core/auth/effects";
import type { AppContext } from "@/worker";
import { Effect } from "effect";
import { AuthServiceLive } from "../layers";

export const makeAuthResponseEffect = (request: Request) => {
  return handler().pipe(Effect.provide(AuthServiceLive(request)));
};

// Production code just runs it
export const authResponse = async ({ request }: { request: Request }) => {
  return Effect.runPromise(makeAuthResponseEffect(request));
};

export const sessionHandler = async ({
  ctx,
  request,
}: {
  ctx: AppContext;
  request: Request;
}) => {
  const getSessionEffect = getSession().pipe(
    Effect.provide(AuthServiceLive(request)),
  );

  return Effect.runPromise(
    getSessionEffect.pipe(
      Effect.match({
        onFailure: (e) =>
          new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
          }),
        onSuccess: ({ session, user }) => {
          if (!session || !user)
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
            });
          if (session.expiresAt < new Date())
            return new Response(JSON.stringify({ error: "Session expired" }), {
              status: 401,
            });
          ctx.session = session;
          ctx.user = user;
        },
      }),
    ),
  );
};
