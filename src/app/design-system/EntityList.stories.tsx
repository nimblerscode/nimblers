import type { Meta, StoryObj } from "@storybook/react-vite";
import { Ellipsis } from "lucide-react";
// import { Avatar } from "./Avatar"; // Not directly used, avatarProps are passed
import { Button } from "./Button"; // For actions example
import { EntityList } from "./EntityList";
import { Icon } from "./Icon";
import { HStack } from "./Layout"; // For custom actions example
// import { Icon } from "./Icon";   // Not directly used, default icon in EntityList or custom actions
import { Text } from "./Text"; // For extraInfo example

const meta: Meta<typeof EntityList> = {
  title: "Design System/EntityList",
  component: EntityList,
  parameters: {
    layout: "padded", // Use padded as it's a list
  },
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const members = [
  {
    id: "1",
    name: "John Smith",
    email: "john@example.com",
    role: "Owner",
    joinDate: "Joined Jun 15, 2023",
    avatar: { colorScheme: "brand" as const },
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    role: "Admin",
    joinDate: "Joined Jun 16, 2023",
    avatar: {
      colorScheme: "gray" as const,
      src: "https://via.placeholder.com/100/A0D0FF/FFFFFF?Text=SJ",
    }, // Example with image
  },
  {
    id: "3",
    name: "Michael Brown",
    email: "michael@example.com",
    role: "Member",
    joinDate: "Joined Jun 18, 2023",
    avatar: { colorScheme: "success" as const },
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily@example.com",
    role: "Member",
    joinDate: "Joined Jul 22, 2023",
    avatar: { name: "Emily Davis", colorScheme: "warning" as const },
  },
];

export const Default: Story = {
  args: {
    title: "Active Members (4)",
    children: members.map((member) => (
      <EntityList.Item
        key={member.id}
        title={member.name}
        subtitle={member.email}
        avatarProps={{ name: member.name, ...member.avatar }}
        extraInfo={
          <Text /*size="sm"*/
            color="content.subtle"
            css={{ fontSize: "0.875rem" }}
          >
            {member.joinDate}
          </Text>
        } // css prop for size
      // Default actions will be shown (ellipsis button)
      />
    )),
  },
};

export const WithoutListTitle: Story = {
  args: {
    children: members.slice(0, 2).map((member) => (
      <EntityList.Item
        key={member.id}
        title={member.name}
        subtitle={member.email}
        avatarProps={{ name: member.name, ...member.avatar }}
        extraInfo={member.joinDate} // Plain string here, Text component for styling is preferred as in Default story
      />
    )),
  },
};

export const WithCustomActions: Story = {
  args: {
    title: "Team Members (2)",
    children: members.slice(0, 2).map((member) => (
      <EntityList.Item
        key={member.id}
        title={member.name}
        subtitle={member.email}
        avatarProps={{ name: member.name, ...member.avatar }}
        extraInfo={member.joinDate}
        actions={
          <HStack /*spacing="2"*/ css={{ gap: "0.5rem" }}>
            {" "}
            {/* css prop for gap */}
            <Button variant="outline" size="sm">
              Edit
            </Button>
            <Button variant="danger" size="sm">
              Remove
            </Button>
          </HStack>
        }
      />
    )),
  },
};

export const EmptyList: Story = {
  args: {
    title: "No Active Members",
    children: (
      <EntityList.Item
        title="No members found."
        subtitle="Invite new members to get started."
        avatarProps={{ name: "?", colorScheme: "gray" }} // Placeholder avatar
        actions={
          <Button variant="ghost" size="sm">
            <Icon icon={Ellipsis} size={16} />
          </Button>
        }
      />
    ),
  },
};

export const SingleItem: Story = {
  args: {
    title: "Project Lead (1)",
    children: (
      <EntityList.Item
        key={members[0].id}
        title={members[0].name}
        subtitle={members[0].email}
        avatarProps={{ name: members[0].name, ...members[0].avatar }}
        extraInfo={members[0].joinDate}
        actions={<Button size="sm">View Profile</Button>}
      />
    ),
  },
};
