import { LoginWrapper } from "@/app/components/login/Wrapper";

export function Layout({ request }: { request: Request }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const redirect = url.searchParams.get("redirect");
  const email = url.searchParams.get("email");

  return <LoginWrapper token={token} redirect={redirect} email={email} />;
}
