import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar, type AvatarProps } from "./Avatar";
import { VStack } from "./Layout";

const meta: Meta<typeof Avatar> = {
  title: "Design System/Avatar",
  component: Avatar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    name: { control: "text" },
    src: { control: "text" },
    size: {
      control: { type: "select" },
      options: ["xs", "sm", "md", "lg", "xl"],
    },
    colorScheme: {
      control: { type: "select" },
      options: ["brand", "gray", "success", "warning", "danger"],
    },
  },
};

export default meta;

type Story = StoryObj<AvatarProps>;

export const Default: Story = {
  args: {
    name: "John Smith",
    size: "md",
    colorScheme: "brand",
  },
};

export const WithImage: Story = {
  args: {
    name: "Jane Doe",
    src: "https://via.placeholder.com/150", // Replace with a real image URL for testing
    size: "lg",
    colorScheme: "gray",
  },
};

export const InitialsOnly: Story = {
  args: {
    name: "Michael Brown",
    size: "sm",
    colorScheme: "success",
  },
};

export const DifferentSizes: Story = {
  render: (args: AvatarProps) => (
    <VStack css={{ gap: "1rem" }}>
      <Avatar {...args} name="Extra Small" size="xs" />
      <Avatar {...args} name="Small" size="sm" />
      <Avatar {...args} name="Medium" size="md" />
      <Avatar {...args} name="Large" size="lg" />
      <Avatar {...args} name="Extra Large" size="xl" />
    </VStack>
  ),
  args: {
    colorScheme: "brand",
  },
};

export const DifferentColorSchemes: Story = {
  render: (args: AvatarProps) => (
    <VStack css={{ gap: "1rem" }}>
      <Avatar {...args} name="Brand CS" colorScheme="brand" />
      <Avatar {...args} name="Gray CS" colorScheme="gray" />
      <Avatar {...args} name="Success CS" colorScheme="success" />
      <Avatar {...args} name="Warning CS" colorScheme="warning" />
      <Avatar {...args} name="Danger CS" colorScheme="danger" />
    </VStack>
  ),
  args: {
    size: "md",
  },
};
