import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../../../design-system"; // Assuming Box is exported from design system index
import { PlanDurationSelector } from "./PlanDurationSelector";

const meta: Meta<typeof PlanDurationSelector> = {
  title: "Components/Organization/PlanDurationSelector",
  component: PlanDurationSelector,
  tags: ["autodocs"],
  argTypes: {
    defaultValue: {
      control: "radio",
      options: ["monthly", "yearly"],
      description: "The initially selected duration.",
    },
    // value: { control: 'radio', options: ['monthly', 'yearly'] }, // For controlled component
    isDisabled: {
      control: "boolean",
      description: "Whether the selector is disabled.",
    },
    isReadOnly: {
      control: "boolean",
      description: "Whether the selector is read-only.",
    },
    orientation: {
      control: "radio",
      options: ["horizontal", "vertical"],
      description: "Orientation of the selector.",
    },
    name: {
      control: "text",
      description: "Name for the radio group, submitted with form data.",
    },
    // onSelectionChange: { action: 'selectionChanged' }, // Requires react-aria-components types for action
  },
  args: {
    defaultValue: "monthly",
    isDisabled: false,
    isReadOnly: false,
    orientation: "horizontal",
    name: "planDuration",
  },
  decorators: [
    (Story) => (
      <Box p="4">
        <Story />
      </Box>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const DefaultYearly: Story = {
  args: {
    defaultValue: "yearly",
  },
};

export const Disabled: Story = {
  args: {
    isDisabled: true,
  },
};

export const ReadOnly: Story = {
  args: {
    defaultValue: "yearly",
    isReadOnly: true,
  },
};

export const Vertical: Story = {
  args: {
    orientation: "vertical",
  },
};

// To test onSelectionChange, you would typically manage state in the story
// import { useState } from 'react';
// export const Controlled: Story = {
//   render: (args) => {
//     const [selected, setSelected] = useState(args.defaultValue || 'monthly');
//     return <PlanDurationSelector {...args} value={selected} onChange={setSelected} />;
//   },
//   args: {
//     defaultValue: 'monthly',
//   },
// };
