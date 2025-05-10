import type { RequestInfo } from "@redwoodjs/sdk/worker";

export function Home({ ctx }: RequestInfo) {
  return (
    <div>
      <p>
        {ctx.user?.name
          ? `You are logged in as user ${ctx.user.name}`
          : "You are not logged in"}
      </p>
    </div>
  );
}
