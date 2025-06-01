import type { SerializableInvitation } from "@/app/actions/invitations/list";
import { EntityList } from "@/app/design-system";

export function PendingInvitationsList({
  title,
  actions,
  invitations,
}: {
  title: string;
  actions?: React.ReactNode;
  invitations: SerializableInvitation[];
}) {
  return (
    <EntityList title={title}>
      {invitations.map((invitation) => (
        <EntityList.Item
          key={invitation.id}
          title={invitation.email}
          subtitle={invitation.role ?? "Member (Pending)"}
          avatarProps={{ name: invitation.email }}
          extraInfo={`Invited ${new Date(invitation.createdAt).toLocaleDateString()}`}
          actions={actions}
        />
      ))}
    </EntityList>
  );
}
