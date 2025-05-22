import type { Meta, StoryObj } from "@storybook/react-vite";

import { Layout } from "./Layout";

const meta = {
  component: Layout,
  title: "Pages/SignUp",
} satisfies Meta<typeof Layout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
