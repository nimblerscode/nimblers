import { Grid } from "@/app/design-system";

import { TTabs } from "@/app/design-system";
import type { User } from "@/domain/global/user/model";
import type { Organization } from "@/domain/tenant/organization/model";
import type { Key } from "react-aria-components";
import { MembersList } from "./members/MembersList";
import { PendingInvitationsList } from "./members/PendingInvitationsList";
import { Overview } from "./overview/Overview";
import { Subscription } from "./overview/Subscription";
import { InvitationModal } from "./members/InvitationModal";
import type { SerializableInvitation } from "@/app/actions/invitations/list";


export function Tabs({
  user,
  members,
  organization,
  activeTab,
  pendingInvitations = []
}: {
  user: User;
  members: User[];
  organization: Organization;
  activeTab: string;
  pendingInvitations?: SerializableInvitation[];
}) {
  const handleTabChange = (key: Key) => {
    history.pushState(null, "", `/organization/${organization.slug}/${key}`);
  };

  return (
    <TTabs.Root defaultSelectedKey={activeTab} onSelectionChange={handleTabChange}>
      <TTabs.List aria-label="Navigation">
        <TTabs.Tab id="overview">Overview</TTabs.Tab>
        <TTabs.Tab id="members">Members</TTabs.Tab>
      </TTabs.List>
      <TTabs.Panel id="overview">
        <Grid
          gridTemplateColumns={{ base: "1fr", md: "2fr 1fr" }}
          gap="6"
        >
          <Overview organization={organization} />
          <Subscription />
        </Grid>
      </TTabs.Panel>
      <TTabs.Panel id="members">
        <MembersList title={`Active Members (${members.length})`} members={members} />
        {pendingInvitations.length > 0 && (
          <PendingInvitationsList
            title={`Pending Invitations (${pendingInvitations.length})`}
            invitations={pendingInvitations}
          />
        )}
        <InvitationModal slug={organization.slug} user={user} />
      </TTabs.Panel>
    </TTabs.Root>
  )
}
