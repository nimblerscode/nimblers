import type { Meta, StoryObj } from "@storybook/react-vite";
import { SignUpForm } from "./Form";

const meta = {
  component: SignUpForm,
} satisfies Meta<typeof SignUpForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
