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
  const getSessionEffect = getSession().pipe(
    Effect.provide(AuthServiceLive(request)),
  );

  return Effect.runPromise(
    getSessionEffect.pipe(
      Effect.match({
        onFailure: (_e) =>
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

// Optional session handler that doesn't fail if no session exists
// This is useful for pages that work for both authenticated and unauthenticated users
export const optionalSessionHandler = async ({
  ctx,
  request,
}: {
  ctx: AppContext;
  request: Request;
}) => {
  const getSessionEffect = getSession().pipe(
    Effect.provide(AuthServiceLive(request)),
  );

  try {
    await Effect.runPromise(
      getSessionEffect.pipe(
        Effect.match({
          onFailure: (_e) => {
            // Don't fail, just continue without authentication
            return undefined;
          },
          onSuccess: ({ session, user }) => {
            if (!session || !user) {
              return undefined;
            }
            if (session.expiresAt < new Date()) {
              return undefined;
            }
            // Populate context with session data
            ctx.session = session;
            ctx.user = user;
            return undefined;
          },
        }),
      ),
    );
  } catch (_error) {
    // If anything goes wrong, just continue without session
  }
};

// Middleware to redirect authenticated users away from login/signup pages
// This prevents users with active sessions from accessing authentication pages
export const redirectAuthenticatedUsers = async ({
  ctx,
  request,
}: {
  ctx: AppContext;
  request: Request;
}) => {
  const getSessionEffect = getSession().pipe(
    Effect.provide(AuthServiceLive(request)),
  );

  try {
    await Effect.runPromise(
      getSessionEffect.pipe(
        Effect.match({
          onFailure: (_e) => {
            // No session found, allow access to login/signup pages
            return undefined;
          },
          onSuccess: ({ session, user }) => {
            if (!session || !user) {
              return undefined;
            }
            if (session.expiresAt < new Date()) {
              return undefined;
            }

            // User has valid session, populate context for potential use
            ctx.session = session;
            ctx.user = user;
            return undefined;
          },
        }),
      ),
    );

    // If we have a valid session, redirect to appropriate page
    if (ctx.session && ctx.user) {
      const url = new URL(request.url);

      // Check if this is an invitation flow
      const token = url.searchParams.get("token");
      if (token) {
        // For invitation flows, redirect to the invitation page
        return new Response(null, {
          status: 302,
          headers: { Location: `/invite/${token}` },
        });
      }

      // For regular login/signup, redirect to profile or organization
      return new Response(null, {
        status: 302,
        headers: { Location: "/profile" },
      });
    }
  } catch (_error) {
    // If anything goes wrong, just continue to allow access
  }
};
