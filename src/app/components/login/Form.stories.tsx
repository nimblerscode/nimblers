// create a story for the login form

import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoginForm } from "./Form";

const meta = {
  component: LoginForm,
} satisfies Meta<typeof LoginForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    token: null,
    redirect: null,
    email: null,
  },
};
