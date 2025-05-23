import { EntityList, Text } from "@/app/design-system";
import type { SerializableInvitation } from "@/app/actions/invitations/list";

export function PendingInvitationsList({
  title,
  actions,
  invitations
}: {
  title: string;
  actions?: React.ReactNode;
  invitations: SerializableInvitation[];
}) {
  console.log("pending invitations", invitations);

  return (
    <EntityList title={title}>
      {invitations.map((invitation) => (
        <EntityList.Item
          key={invitation.id}
          title={invitation.email}
          subtitle={invitation.role ?? "Member (Pending)"}
          avatarProps={{ name: invitation.email }}
          extraInfo={
            <Text
              color="content.subtle"
            >
              Invited {new Date(invitation.createdAt).toLocaleDateString()}
            </Text>
          }
          actions={actions}
        />
      ))}
    </EntityList>
  );
} 
