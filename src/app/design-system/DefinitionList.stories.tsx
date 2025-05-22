import { DList } from "./DefinitionList";

const meta = {
  title: "Design System/DefinitionList",
  component: DList.Root,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    spacing: {
      control: "text",
      description: "Spacing between definition term-description groups",
      table: {
        defaultValue: { summary: "6" },
      },
    },
  },
};

export default meta;

// Basic usage story
export const Basic = {
  render: () => (
    <DList.Root>
      <DList.Term>Organization ID</DList.Term>
      <DList.Description>org_123456</DList.Description>

      <DList.Term>Created On</DList.Term>
      <DList.Description>Jun 15, 2023</DList.Description>

      <DList.Term>Owner</DList.Term>
      <DList.Description>John Smith</DList.Description>
    </DList.Root>
  ),
};

// Custom group spacing story
export const CustomGroupSpacing = {
  render: () => (
    <DList.Root spacing="8">
      <DList.Term>Organization ID</DList.Term>
      <DList.Description>org_123456</DList.Description>

      <DList.Term>Created On</DList.Term>
      <DList.Description>Jun 15, 2023</DList.Description>
    </DList.Root>
  ),
};

// Custom styling story
export const CustomStyling = {
  render: () => (
    <DList.Root>
      <DList.Term css={{ color: "blue.500", textTransform: "uppercase" }}>
        Custom Term Style
      </DList.Term>
      <DList.Description css={{ fontWeight: "bold" }}>
        Custom Description Style
      </DList.Description>

      <DList.Term>Regular Term</DList.Term>
      <DList.Description>Regular Description</DList.Description>
    </DList.Root>
  ),
};

// Nested content story
export const NestedContent = {
  render: () => (
    <DList.Root>
      <DList.Term>Simple Text</DList.Term>
      <DList.Description>Basic description</DList.Description>

      <DList.Term>Rich Content</DList.Term>
      <DList.Description>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "24px",
              height: "24px",
              background: "#e2e8f0",
              borderRadius: "50%",
            }}
          />
          <span>John Smith</span>
        </div>
      </DList.Description>
    </DList.Root>
  ),
};
