import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/app/design-system/Button";
import { InvitationModal, SimpleInvitationModal } from "./InvitationModal";

// Mock user for stories
const mockUser = {
  id: "user123",
  email: "admin@example.com",
  name: "John Admin",
} as any;

const meta: Meta<typeof InvitationModal> = {
  title: "Organization Components/InvitationModal",
  component: InvitationModal,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slug: "my-project",
    user: mockUser,
    trigger: <Button>Invite to Project</Button>,
    onSuccess: (_invitation) => {},
  },
};

export const WithCustomTrigger: Story = {
  args: {
    slug: "acme-corp",
    user: mockUser,
    trigger: <Button variant="outline">Invite Team Member</Button>,
    onSuccess: (invitation) => {
      alert(`Invitation sent to ${invitation.email}`);
    },
  },
};

export const WithCallbacks: Story = {
  args: {
    slug: "callback-demo",
    user: mockUser,
    trigger: <Button variant="primary">Invite with Callbacks</Button>,
    onSuccess: (_invitation) => {},
    onClose: () => {},
  },
};

export const SimpleExample = () => (
  <SimpleInvitationModal
    slug="design-system"
    user={mockUser}
    onSuccess={(_invitation) => {}}
  />
);
