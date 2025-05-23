"use server";
import type { RequestInfo } from "rwsdk/worker";
import { getOrganization } from "@/app/actions/organization/get";
import { Wrapper } from "../../../components/organizations/slug/Wrapper";
import { getMembers } from "@/app/actions/members/get";

export async function Layout({ params }: RequestInfo) {
  const org = await getOrganization(params.orgSlug);
  const { members } = await getMembers(params.orgSlug);
  return <Wrapper organization={org} members={members} activeTab={params.tab} />;
}
