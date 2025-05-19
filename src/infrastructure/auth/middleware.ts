import { Effect } from "effect";
import { getSession } from "@/application/global/auth/getSession";
import { handler } from "@/application/global/auth/handler";
import { AuthServiceLive } from "@/config/layers";
import type { AppContext } from "@/infrastructure/cloudflare/worker";

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
  console.log("sessionHandler", ctx);
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

          console.log("sessionHandler", ctx);
        },
      }),
    ),
  );
};
