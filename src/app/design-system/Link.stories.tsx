import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "./Layout"; // For layout in stories
import { Link, type LinkProps } from "./Link";
import { Text } from "./Text"; // For demonstrating inherited font size

const meta: Meta<typeof Link> = {
  title: "Design System/Link",
  component: Link,
  tags: ["autodocs"],
  argTypes: {
    href: {
      control: "text",
      description: "The URL the link points to.",
    },
    children: {
      control: "text",
      description: "The content of the link.",
    },
    isExternal: {
      control: "boolean",
      description:
        "Explicitly set if the link is external. Overrides automatic detection.",
    },
    showExternalIcon: {
      control: "boolean",
      description: "Whether to show the external link icon (if applicable).",
    },
    className: {
      control: "text",
      description: "Custom CSS class name.",
    },
    css: {
      control: "object",
      description: "Custom Panda CSS style object.",
    },
  },
  args: {
    children: "Click me",
    href: "#",
    isExternal: undefined,
    showExternalIcon: true,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Default Link",
    href: "/",
  },
};

export const External: Story = {
  args: {
    children: "External Link (auto-detected)",
    href: "https://example.com",
  },
};

export const ExternalExplicit: Story = {
  args: {
    children: "External Link (explicitly set)",
    href: "/internal-path-but-marked-external",
    isExternal: true,
  },
};

export const ExternalNoIcon: Story = {
  args: {
    children: "External Link (no icon)",
    href: "https://example.com",
    showExternalIcon: false,
  },
};

export const CustomStyling: Story = {
  args: {
    children: "Link with Custom Styling",
    href: "/",
    css: {
      fontWeight: "extrabold",
      fontStyle: "italic",
      color: "status.success.background",
      _hover: {
        color: "status.danger.background",
      },
    },
  },
};

export const InheritedFontSize: Story = {
  render: (args: LinkProps) => (
    <Flex direction="column" gap="4">
      <Text fontSize="xs">
        This is extra small text with an{" "}
        <Link {...args} href="/xs-link">
          XS link
        </Link>{" "}
        inside.
      </Text>
      <Text fontSize="md">
        This is medium text with a{" "}
        <Link {...args} href="/md-link">
          regular link
        </Link>{" "}
        inside.
      </Text>
      <Text fontSize="2xl">
        This is 2XL text with a{" "}
        <Link {...args} href="/2xl-link">
          2XL link
        </Link>{" "}
        inside.
      </Text>
      <Text fontSize="4xl" fontWeight="bold">
        This is bold 4XL text with an{" "}
        <Link {...args} href="/4xl-link">
          important link
        </Link>
        .
      </Text>
    </Flex>
  ),
  args: {
    href: "#",
    isExternal: false,
  },
};

export const MultipleLinks: Story = {
  render: (args: LinkProps) => (
    <Box display="flex" flexDirection="column" gap="3">
      <Link {...args} href="/page1">
        Internal Page 1
      </Link>
      <Link
        {...args}
        href="https://example.com"
        showExternalIcon={
          args.showExternalIcon !== undefined ? args.showExternalIcon : true
        }
      >
        External Example
      </Link>
      <Link {...args} href="/page2">
        Internal Page 2 (inherits size)
      </Link>
      <Link {...args} href="mailto:test@example.com">
        Email Us
      </Link>
    </Box>
  ),
  args: {
    showExternalIcon: true,
  },
};
