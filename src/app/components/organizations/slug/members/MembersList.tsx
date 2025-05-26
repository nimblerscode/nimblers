import { EntityList, Text } from "@/app/design-system";
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
          extraInfo={
            <Text /*size="sm"*/
              color="content.subtle"
              css={{ fontSize: "0.875rem" }}
            >
              Joined {new Date(member.createdAt).toLocaleDateString()}
            </Text>
          }
          actions={actions}
        />
      ))}
    </EntityList>
  );
}
