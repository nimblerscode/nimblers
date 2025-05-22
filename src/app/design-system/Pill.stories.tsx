import type { Meta } from "@storybook/react-vite";
import { Pill } from "./Pill";

const meta = {
  title: "Design System/Pill",
  component: Pill,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Pill>;

export default meta;

export const Default = {
  args: {
    children: "Default",
  },
};

export const Variants = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <Pill variant="brand" size="lg">
        Brand
      </Pill>
      <Pill variant="success" size="lg">
        Success
      </Pill>
      <Pill variant="warning" size="lg">
        Warning
      </Pill>
      <Pill variant="danger" size="lg">
        Danger
      </Pill>
      <Pill variant="info" size="lg">
        Info
      </Pill>
      <Pill variant="discount" size="lg">
        -20%
      </Pill>
      <Pill variant="recommended" size="lg">
        Recommended
      </Pill>
    </div>
  ),
};

export const Sizes = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <Pill variant="brand" size="sm">
        Small
      </Pill>
      <Pill variant="success" size="sm">
        Medium
      </Pill>
      <Pill variant="warning" size="sm">
        Large
      </Pill>
    </div>
  ),
};

export const UseCases = {
  render: () => (
    <div
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <Pill variant="recommended" size="sm">
        Recommended
      </Pill>
      <Pill variant="discount" size="sm">
        -20% OFF
      </Pill>
      <Pill variant="success" size="sm">
        In Stock
      </Pill>
      <Pill variant="warning" size="sm">
        Low Stock
      </Pill>
      <Pill variant="danger" size="sm">
        Out of Stock
      </Pill>
      <Pill variant="info" size="sm">
        New
      </Pill>
      <Pill variant="brand" size="sm">
        Featured
      </Pill>
    </div>
  ),
};
