import type { Meta, StoryObj } from "@storybook/react-vite";
import { VStack } from "../../../styled-system/jsx";
import { Button } from "./Button";
import { Dialog, DialogBody, DialogFooter } from "./Dialog";
import { TextFieldRoot as TextField } from "./Input";
import { Text } from "./Text";

const meta: Meta<typeof Dialog> = {
  title: "Design System/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    trigger: <Button>Open Dialog</Button>,
    title: "Confirm Action",
    children: (close: () => void) => (
      <VStack gap="4" alignItems="stretch">
        <Text>Are you sure you want to perform this action?</Text>
        <DialogFooter>
          <Button variant="secondary" onPress={close}>
            Cancel
          </Button>
          <Button variant="primary" onPress={close}>
            Confirm
          </Button>
        </DialogFooter>
      </VStack>
    ),
  },
};

export const WithForm: Story = {
  args: {
    trigger: <Button>Edit Profile</Button>,
    title: "Edit Profile",
    size: "lg",
    children: (close: () => void) => (
      <VStack gap="6" alignItems="stretch">
        <VStack gap="4" alignItems="stretch">
          <TextField label="First Name" defaultValue="John" isRequired />
          <TextField label="Last Name" defaultValue="Doe" isRequired />
          <TextField
            label="Email"
            type="email"
            defaultValue="john.doe@example.com"
            isRequired
          />
        </VStack>
        <DialogFooter>
          <Button variant="secondary" onPress={close}>
            Cancel
          </Button>
          <Button variant="primary" onPress={close}>
            Save Changes
          </Button>
        </DialogFooter>
      </VStack>
    ),
  },
};

export const Destructive: Story = {
  args: {
    trigger: <Button variant="danger">Delete Account</Button>,
    title: "Delete Account",
    children: (close: () => void) => (
      <VStack gap="6" alignItems="stretch">
        <VStack gap="3" alignItems="stretch">
          <Text>
            <strong>This action cannot be undone.</strong> This will permanently
            delete your account and remove your data from our servers.
          </Text>
          <div className="bg-status-danger-subtleBg border border-status-danger-border rounded-sm p-4">
            <Text className="text-status-danger-text">
              Please type <strong>DELETE</strong> to confirm.
            </Text>
          </div>
          <TextField
            inputProps={{ placeholder: "Type DELETE to confirm" }}
            isRequired
          />
        </VStack>
        <DialogFooter>
          <Button variant="secondary" onPress={close}>
            Cancel
          </Button>
          <Button variant="danger" onPress={close}>
            Delete Account
          </Button>
        </DialogFooter>
      </VStack>
    ),
  },
};

export const NoCloseButton: Story = {
  args: {
    trigger: <Button>Required Action</Button>,
    title: "Complete Setup",
    showCloseButton: false,
    children: (close: () => void) => (
      <VStack gap="4" alignItems="stretch">
        <Text>Please complete the required setup before continuing.</Text>
        <DialogFooter>
          <Button variant="primary" onPress={close}>
            Complete Setup
          </Button>
        </DialogFooter>
      </VStack>
    ),
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <Dialog
        trigger={<Button variant="outline">Small</Button>}
        title="Small Dialog"
        size="sm"
      >
        {(close: () => void) => (
          <VStack gap="4" alignItems="stretch">
            <Text>This is a small dialog.</Text>
            <DialogFooter>
              <Button variant="primary" onPress={close}>
                Close
              </Button>
            </DialogFooter>
          </VStack>
        )}
      </Dialog>

      <Dialog
        trigger={<Button variant="outline">Medium</Button>}
        title="Medium Dialog"
        size="md"
      >
        {(close: () => void) => (
          <VStack gap="4" alignItems="stretch">
            <Text>This is a medium dialog (default size).</Text>
            <DialogFooter>
              <Button variant="primary" onPress={close}>
                Close
              </Button>
            </DialogFooter>
          </VStack>
        )}
      </Dialog>

      <Dialog
        trigger={<Button variant="outline">Large</Button>}
        title="Large Dialog"
        size="lg"
      >
        {(close: () => void) => (
          <VStack gap="4" alignItems="stretch">
            <Text>This is a large dialog with more space for content.</Text>
            <DialogFooter>
              <Button variant="primary" onPress={close}>
                Close
              </Button>
            </DialogFooter>
          </VStack>
        )}
      </Dialog>
    </div>
  ),
};

// Compound component usage
export const CompoundComponents: Story = {
  render: () => (
    <Dialog
      trigger={<Button>Compound Components</Button>}
      title="Using Compound Components"
    >
      {(close: () => void) => (
        <>
          <DialogBody>
            <VStack gap="4" alignItems="stretch">
              <Text>
                This example shows how to use the individual dialog components
                for more granular control over the layout and styling.
              </Text>
              <TextField
                label="Name"
                inputProps={{ placeholder: "Enter your name" }}
              />
              <TextField
                label="Message"
                inputProps={{ placeholder: "Enter your message" }}
              />
            </VStack>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onPress={close}>
              Cancel
            </Button>
            <Button variant="primary" onPress={close}>
              Send Message
            </Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  ),
};
