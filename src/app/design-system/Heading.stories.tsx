import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../../../styled-system/jsx";
import { Heading, type HeadingProps } from "./Heading";

const meta: Meta<typeof Heading> = {
  title: "Design System/Heading",
  component: Heading,
  parameters: {
    layout: "start", // Use 'start' or 'padded' for headings to see margins
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["h1", "h2", "h3", "h4", "h5", "h6"],
      description: "The HTML heading element to render.",
    },
    levelStyle: {
      control: "select",
      options: ["h1", "h2", "h3", "h4", "h5", "h6", undefined],
      description:
        "Explicitly set the styling level (e.g., h1 style for an h2 element). Defaults to `as` value.",
    },
    color: {
      control: "text", // Or a select with theme colors if preferred
      description: "Heading color, defaults to 'page.textHeadline'.",
    },
    fontFamily: {
      control: "text",
      description: "Font family, defaults to 'heading' token.",
    },
    children: {
      control: "text",
      description: "The content of the heading.",
    },
    css: {
      control: "object",
      description: "Panda CSS style object for custom styling overrides.",
    },
    marginTop: { control: "text", description: "Top margin override" },
    marginBottom: { control: "text", description: "Bottom margin override" },
    fontSize: { control: "text", description: "Font size override" },
    fontWeight: { control: "text", description: "Font weight override" },
  },
  args: {
    children: "Sample Heading Text",
    as: "h1",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultH1: Story = {
  args: {
    as: "h1",
    children: "Heading Level 1 (as h1)",
  },
};

export const DefaultH2: Story = {
  args: {
    as: "h2",
    children: "Heading Level 2 (as h2)",
  },
};

export const DefaultH3: Story = {
  args: {
    as: "h3",
    children: "Heading Level 3 (as h3)",
  },
};

export const DefaultH4: Story = {
  args: {
    as: "h4",
    children: "Heading Level 4 (as h4)",
  },
};

export const DefaultH5: Story = {
  args: {
    as: "h5",
    children: "Heading Level 5 (as h5)",
  },
};

export const DefaultH6: Story = {
  args: {
    as: "h6",
    children: "Heading Level 6 (as h6)",
  },
};

export const H2StyledAsH1: Story = {
  args: {
    as: "h2", // Semantically an h2
    levelStyle: "h1", // Visually styled as an h1
    children: "H2 Element, H1 Style",
    css: { color: "blue.500" },
  },
};

export const H1StyledAsH4: Story = {
  args: {
    as: "h1", // Semantically an h1
    levelStyle: "h4", // Visually styled as an h4
    children: "H1 Element, H4 Style",
  },
};

export const CustomColorAndMargins: Story = {
  args: {
    as: "h2",
    children: "Customized H2",
    color: "status.danger.textSubtle", // Using a semantic token
    css: {
      marginTop: "10", // Overriding default margin (e.g., 2.5rem)
      marginBottom: "1",
      borderBottom: "2px solid {colors.border.interactive}",
      paddingBottom: "2",
    },
  },
};

export const AllLevelsStack: Story = {
  render: (args: HeadingProps) => (
    <Box maxWidth="container.md">
      <Heading {...args} as="h1">
        Dynamic H1: {args.children}
      </Heading>
      <Heading {...args} as="h2">
        Dynamic H2: {args.children}
      </Heading>
      <Heading {...args} as="h3">
        Dynamic H3: {args.children}
      </Heading>
      <Heading {...args} as="h4">
        Dynamic H4: {args.children}
      </Heading>
      <Heading {...args} as="h5">
        Dynamic H5: {args.children}
      </Heading>
      <Heading {...args} as="h6">
        Dynamic H6: {args.children}
      </Heading>
      <hr />
      <Heading {...args} as="h2" levelStyle="h1">
        H2 element, H1 style: {args.children}
      </Heading>
    </Box>
  ),
  args: {
    children: "(Shared Text)",
  },
  parameters: {
    docs: {
      description: {
        story:
          "This story demonstrates all heading levels dynamically using their respective `as` prop values, and shows how `levelStyle` can be used to decouple semantic HTML from visual styling. The Heading component is designed for `h1` through `h6` elements.",
      },
    },
  },
};
