import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../../../styled-system/jsx";
import { Text, type TextProps } from "./Text";

const meta: Meta<typeof Text> = {
  title: "Design System/Text",
  component: Text,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: [
        "p",
        "span",
        "div",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "label",
        "caption",
        "small",
        "strong",
        "em",
      ],
      description: "The HTML element to render the text as.",
    },
    color: {
      control: "color",
      description:
        "Text color, defaults to 'content.primary' from semantic tokens.",
    },
    children: {
      control: "text",
      description: "The content of the text component.",
    },
    css: {
      control: "object",
      description: "Panda CSS style object for custom styling.",
    },
    // htmlFor is not a direct prop of Text, so it's not in argTypes.
    // It's passed via ...props when as='label'.
    // The LabelForInput story uses a custom args type for htmlFor.
  },
  args: {
    children: "This is a sample text.",
    as: "p",
  },
};

export default meta;

// Base story type
type Story = StoryObj<typeof meta>;

// Specific type for the LabelForInput story's args, extending base TextProps
interface LabelStoryArgs extends TextProps {
  htmlFor?: string;
}

// More specific StoryObj type for LabelForInput to include LabelStoryArgs
type LabelStory = StoryObj<LabelStoryArgs & TextProps>; // Intersect to ensure all TextProps are valid

export const Default: Story = {
  args: {
    children: "This is a default paragraph text.",
  },
};

export const AsHeading1: Story = {
  args: {
    as: "h1",
    children: "This is a Heading 1",
    css: { fontSize: "4xl", fontWeight: "bold", color: "page.textAccent" },
  },
};

export const AsSpan: Story = {
  args: {
    as: "span",
    children: "This is a span of text.",
    css: { fontStyle: "italic", color: "red.500" }, // Example of direct token usage
  },
};

export const AsDivWithCustomStyles: Story = {
  args: {
    as: "div",
    children: "This is a div with custom padding and background.",
    css: {
      padding: "4", // theme.spacing[4]
      backgroundColor: "surface.secondary",
      borderRadius: "md",
      border: "1px solid token(colors.border.default)",
    },
  },
};

export const DifferentColors: Story = {
  render: (args) => (
    <Box display="flex" flexDirection="column" gap="3">
      <Text {...args} color="content.primary">
        Primary Text Color (Default)
      </Text>
      <Text {...args} color="content.secondary">
        Secondary Text Color
      </Text>
      <Text {...args} color="brand.onSolid">
        Accent Text Color
      </Text>
      <Text {...args} color="status.success.text">
        Success Status Text Color
      </Text>
      <Text {...args} color="status.danger.text">
        Danger Status Text Color
      </Text>
      <Text {...args} color="purple.600">
        Direct Token Color (purple.600)
      </Text>
    </Box>
  ),
  args: {
    children: "", // Child is set within the render
  },
};

export const WithCustomCssProp: Story = {
  args: {
    children: "Text with gradient and shadow via css prop.",
    css: {
      backgroundClip: "text",
      color: "transparent",
      backgroundImage:
        "linear-gradient(to right, token(colors.blue.500), token(colors.green.500))",
      textShadow: "1px 1px 2px token(colors.gray.400)",
      fontWeight: "bold",
      fontSize: "2xl",
    },
  },
};

export const LabelForInput: LabelStory = {
  // Use the more specific LabelStory type
  args: {
    as: "label",
    htmlFor: "inputId",
    children: "First Name:",
    css: {
      display: "block",
      marginBottom: "1",
      fontWeight: "medium",
    },
  },
  decorators: [
    (StoryComponent: () => React.ReactNode) => (
      <Box>
        <StoryComponent />
        <input
          id="inputId"
          style={{ marginLeft: "8px", padding: "4px" }}
          placeholder="Enter name"
        />
      </Box>
    ),
  ],
};

export const SmallText: Story = {
  args: {
    as: "small",
    children: "This is small print text, often used for disclaimers.",
    css: {
      color: "page.textSecondary",
      fontSize: "xs", // Using a smaller font size token
    },
  },
};
