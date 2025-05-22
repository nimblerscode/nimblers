import { Button } from "./Button"; // Assuming Button.tsx is in the same directory

const meta = {
  title: "Design System/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"], // Enable autodocs for this component
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline"],
      description: "The visual style of the button.",
      table: {
        defaultValue: { summary: "primary" },
      },
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "The size of the button.",
      table: {
        defaultValue: { summary: "md" },
      },
    },
    isDisabled: {
      control: "boolean",
      description: "Whether the button is disabled.",
      table: {
        defaultValue: { summary: false },
      },
    },
    children: {
      control: "text",
      description: "The content of the button (text or other elements).",
    },
    onPress: {
      action: "pressed",
      description: "Handler called when the button is pressed.",
    },
    onPressStart: {
      action: "pressStart",
      description: "Handler called when a press interaction starts.",
    },
    onPressEnd: {
      action: "pressEnd",
      description: "Handler called when a press interaction ends.",
    },
    onPressChange: {
      action: "pressChange",
      description: "Handler called when the press state changes.",
    },
    onPressUp: {
      action: "pressUp",
      description: "Handler called when a press is released.",
    },
    // Add other relevant react-aria-components ButtonProps here if needed
    // For example: autoFocus, excludeFromTabOrder, etc.
  },
  args: {
    variant: "primary",
    size: "md",
    isDisabled: false,
    children: "Button Text",
  },
};

export default meta;

// Basic story with controls
export const Default = {
  render: (args: any) => <Button {...args} />,
};

export const Primary = {
  args: {
    variant: "primary",
    children: "Primary Button",
  },
};

export const Secondary = {
  args: {
    variant: "secondary",
    children: "Secondary Button",
  },
};

export const Outline = {
  args: {
    variant: "outline",
    children: "Outline Button",
  },
};

export const Small = {
  args: {
    size: "sm",
    children: "Small Button",
  },
};

export const Large = {
  args: {
    size: "lg",
    children: "Large Button",
  },
};

export const Disabled = {
  args: {
    isDisabled: true,
    children: "Disabled Button",
  },
};

export const WithCustomContent = {
  args: {
    children: (
      <>
        <span role="img" aria-label="icon" style={{ marginRight: "8px" }}>
          🚀
        </span>
        Launch Rocket
      </>
    ),
  },
};
