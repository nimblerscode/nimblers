import type { Meta, StoryObj } from "@storybook/react-vite";
import { CreateOrganization } from "./Create";

const meta = {
  component: CreateOrganization,
} satisfies Meta<typeof CreateOrganization>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
