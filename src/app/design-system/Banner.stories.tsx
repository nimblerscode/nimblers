import type { Meta, StoryObj } from "@storybook/react-vite";
import { styled } from "../../../styled-system/jsx";
import { Banner } from ".";

const meta: Meta<typeof Banner> = {
  title: "Design System/Banner",
  component: Banner,
  tags: ["autodocs"],
  parameters: {
    layout: "padded", // Or 'fullscreen' or 'centered'
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "success", "warning", "danger"],
      description: "The variant of the banner.",
    },
    title: {
      control: "text",
      description:
        "Optional title for the banner. Can be a string or ReactNode.",
    },
    icon: {
      control: "boolean",
      description:
        "Show a default icon based on variant (true), hide icon (false), or provide custom ReactNode icon.",
    },
    isDismissible: {
      control: "boolean",
      description: "Whether the banner can be dismissed.",
    },
    onDismiss: {
      action: "dismissed",
      description: "Callback when the banner is dismissed.",
    },
    children: {
      control: "text",
      description: "Content of the banner.",
    },
    css: {
      control: "object",
      description: "Custom Panda CSS styles using the css prop.",
    },
  },
  args: {
    variant: "info",
    title: "Information Banner",
    icon: true,
    isDismissible: false,
    children: "This is an informational message providing details and context.",
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const DefaultInfo: Story = {
  args: {
    variant: "info",
    title: "Did you know?",
    children: "Panda CSS can generate your styles on demand!",
    icon: true,
    isDismissible: true,
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    title: "Action Successful!",
    children: "Your changes have been saved successfully.",
    icon: true,
    isDismissible: true,
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    title: "Caution Advised",
    children: "Please double-check your input before proceeding.",
    icon: true,
    isDismissible: true,
  },
};

export const Danger: Story = {
  args: {
    variant: "danger",
    title: "Error Occurred!",
    children:
      "Something went wrong while processing your request. Please try again.",
    icon: true,
    isDismissible: false, // Example of non-dismissible critical error
  },
};

export const WithoutIcon: Story = {
  args: {
    variant: "info",
    title: "No Icon Here",
    children: "This banner does not display an icon.",
    icon: false,
  },
};

export const WithoutTitle: Story = {
  args: {
    variant: "success",
    title: undefined,
    children:
      "This success message appears without a title, straight to the point!",
    icon: true,
  },
};

export const CustomIcon: Story = {
  args: {
    variant: "info",
    title: "Custom Icon Example",
    children: "This banner uses a custom SVG icon.",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    isDismissible: true,
  },
};

export const LongContent: Story = {
  args: {
    variant: "info",
    title: "Banner with a Lot of Content",
    children: (
      <styled.div>
        <styled.p mb="2">
          This banner contains a significant amount of text to demonstrate how
          it handles multi-line content and layout adjustments. The text should
          wrap naturally within the banner's boundaries, maintaining proper
          alignment with the icon and dismiss button if present.
        </styled.p>
        <styled.p>
          Further details can be added here, and they should also respect the
          banner's styling and structure.
        </styled.p>
      </styled.div>
    ),
    icon: true,
    isDismissible: true,
  },
};

export const OnlyChildren: Story = {
  args: {
    variant: "warning",
    title: undefined,
    children:
      "This is a warning banner with only child content, no explicit title or icon.",
    icon: false,
    isDismissible: false,
  },
};
