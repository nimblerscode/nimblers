import type { SerializableInvitation } from "@/app/actions/invitations/list";
import { Grid, Heading, VStack } from "@/app/design-system";
import type { ShopDomain } from "@/domain/global/organization/models";
import type { User } from "@/domain/global/user/model";
import type { Organization } from "@/domain/tenant/organization/model";
import { css } from "../../../../../styled-system/css";
import { InvitationModal } from "./members/InvitationModal";
import { MembersList } from "./members/MembersList";
import { PendingInvitationsList } from "./members/PendingInvitationsList";
import { Overview } from "./overview/Overview";
import { ShopifyConnectCard } from "./overview/ShopifyConnectCard";
import { Subscription } from "./overview/Subscription";

interface ConnectedStore {
  id: string;
  shopDomain: ShopDomain;
  status: "active" | "disconnected" | "error";
  connectedAt: string;
  lastSyncAt: string | null;
}

export function OrganizationDashboard({
  user,
  members,
  organization,
  pendingInvitations = [],
  shopifyData,
}: {
  user: User;
  members: User[];
  organization: Organization;
  pendingInvitations?: SerializableInvitation[];
  shopifyData: {
    clientId: string;
    connectedStores: ConnectedStore[];
    oauthMessage: {
      type: "success" | "error";
      message: string;
    } | null;
  };
}) {
  return (
    <VStack gap="8" alignItems="stretch">
      {/* Organization Details Section */}
      <VStack gap="4" alignItems="stretch">
        <Heading as="h2">Details</Heading>
        <Grid gridTemplateColumns={{ base: "1fr", md: "2fr 1fr" }} gap="6">
          <Overview organization={organization} />
          <Subscription />
        </Grid>
        {/* Shopify Connect Section */}
        <ShopifyConnectCard
          organizationSlug={organization.slug}
          shopifyClientId={shopifyData.clientId}
          connectedStores={shopifyData.connectedStores}
          oauthMessage={shopifyData.oauthMessage}
        />
      </VStack>

      {/* Visual Separator */}
      <div
        className={css({
          borderTop: "1px solid",
          borderColor: "border.strong",
          mx: "0",
        })}
      />

      {/* Team Members Section */}
      <VStack gap="4" alignItems="stretch">
        <Grid
          gridTemplateColumns={{ base: "1fr", md: "1fr auto" }}
          justifyContent="space-between"
          alignItems="center"
        >
          <Heading as="h2">Team Members</Heading>
          <InvitationModal slug={organization.slug} user={user} />
        </Grid>

        {/* Members lists */}
        <VStack gap="6" alignItems="stretch">
          <MembersList
            title={`Active Members (${members.length})`}
            members={members}
          />
          {pendingInvitations.length > 0 && (
            <PendingInvitationsList
              title={`Pending Invitations (${pendingInvitations.length})`}
              invitations={pendingInvitations}
            />
          )}
        </VStack>
      </VStack>
    </VStack>
  );
}
