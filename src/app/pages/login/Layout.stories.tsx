import type { Meta, StoryObj } from "@storybook/react-vite";
import { Layout as LoginLayout } from "./Layout";

const meta = {
  component: LoginLayout,
  title: "Pages/Login",
} satisfies Meta<typeof LoginLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    request: new Request("http://localhost:3000/login") as Request,
  },
};
