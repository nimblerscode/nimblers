import { EntityList } from "@/app/design-system";
import type { User } from "@/domain/global/user/model";

export function MembersList({
  title,
  actions,
  members,
}: {
  title: string;
  actions?: React.ReactNode;
  members: User[];
}) {
  return (
    <EntityList title={title}>
      {members.map((member) => (
        <EntityList.Item
          key={member.id}
          title={member.name ?? member.email}
          subtitle={member.role ?? "Member"}
          avatarProps={{ name: member.name ?? member.email }}
          extraInfo={`Joined ${new Date(member.createdAt).toLocaleDateString()}`}
          actions={actions}
        />
      ))}
    </EntityList>
  );
}
