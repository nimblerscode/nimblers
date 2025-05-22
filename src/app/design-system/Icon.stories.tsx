import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, styled } from "../../../styled-system/jsx";
import { Icon } from "."; // IconProps import removed
import {
  AlertTriangle,
  CheckCircle,
  Home,
  Info,
  MessageSquare,
  Settings,
  ShoppingCart,
} from "./icons"; // Import some icons to use in stories

const meta: Meta<typeof Icon> = {
  title: "Design System/Icon",
  component: Icon,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    icon: {
      control: false, // Icon component itself is not easily controllable via Storybook UI
      description: "The icon component to render (e.g., Info, CheckCircle).",
    },
    color: {
      control: "text",
      description:
        "Panda CSS token for icon stroke color. Inherits if undefined.",
    },
    fillColor: {
      control: "text",
      description: "Panda CSS token for icon fill color. Defaults to 'none'.",
    },
    size: {
      control: "number",
      description: "Size of the icon in pixels.",
    },
    css: {
      control: "object",
      description:
        "Custom Panda CSS styles using the css prop for the wrapper.",
    },
    className: {
      control: "text",
      description: "Standard HTML className for the wrapper.",
    },
  },
  args: {
    // Default args for stories, icon arg will be provided per story
    size: 24,
    color: "content.primary",
    fillColor: "none",
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Info,
  },
  render: (args) => <Icon {...args} />,
};

export const ColoredStroke: Story = {
  name: "Colored (Stroke Only)",
  args: {
    icon: CheckCircle,
    color: "status.success.text",
    size: 32,
  },
  render: (args) => <Icon {...args} />,
};

export const DifferentSizeStroke: Story = {
  name: "Different Size (Stroke Only)",
  args: {
    icon: AlertTriangle,
    color: "status.warning.text",
    size: 48,
  },
  render: (args) => <Icon {...args} />,
};

export const WithCustomCss: Story = {
  args: {
    icon: Home,
    size: 24,
    css: {
      backgroundColor: "surface.secondary",
      padding: "xs",
      borderRadius: "sm",
      color: "interactive.primary.text", // This will be overridden by colorToken if provided
    },
  },
  render: (args) => <Icon {...args} />,
};

export const OverridingWrapperColorWithCss: Story = {
  name: "CSS Overrides Wrapper (Fill/Stroke Test)",
  args: {
    icon: Settings,
    size: 24,
    color: "page.textPrimary",
    fillColor: "colors.yellow.300",
    css: {
      backgroundColor: "surface.tertiary",
      padding: "sm",
      borderRadius: "md",
      color: "status.danger.text",
    },
  },
  render: (args) => (
    <Box>
      <Icon {...args} />
      <styled.p fontSize="xs" color="text.subtle" mt="2">
        Wrapper `css.color` (danger) sets stroke. `fillColor` (yellow) sets
        fill.
      </styled.p>
    </Box>
  ),
};

export const InheritingStrokeAndFill: Story = {
  name: "Inheriting Stroke and Fill (Advanced)",
  args: {
    icon: Info,
    size: 24,
    color: undefined,
    fillColor: "currentColor",
  },
  render: (args) => (
    <Box
      color="status.info.text"
      fontSize="xl"
      padding="md"
      backgroundColor="status.info.surface"
    >
      This text and icon wrapper are info-colored. The icon <Icon {...args} />{" "}
      should inherit this for both stroke and fill.
    </Box>
  ),
};

export const WithFill: Story = {
  args: {
    icon: ShoppingCart,
    color: "interactive.primary.text",
    fillColor: "interactive.primary.background",
    size: 32,
  },
  render: (args) => <Icon {...args} />,
};

export const ContrastingFillAndStroke: Story = {
  args: {
    icon: MessageSquare,
    color: "status.danger.border",
    fillColor: "status.danger.surface",
    size: 48,
  },
  render: (args) => <Icon {...args} />,
};

export const FillWithoutStroke: Story = {
  args: {
    icon: CheckCircle,
    color: "transparent",
    fillColor: "status.success.text",
    size: 32,
  },
  render: (args) => <Icon {...args} />,
};

export const StrokeWithoutFill: Story = {
  args: {
    icon: Home,
    color: "page.textPrimary",
    fillColor: "transparent",
    size: 32,
  },
  render: (args) => <Icon {...args} />,
};

export const WithCustomCssAndFill: Story = {
  args: {
    icon: Home,
    size: 24,
    color: "interactive.primary.text",
    fillColor: "interactive.primary.background",
    css: {
      backgroundColor: "surface.secondary",
      padding: "xs",
      borderRadius: "sm",
    },
  },
  render: (args) => <Icon {...args} />,
};
