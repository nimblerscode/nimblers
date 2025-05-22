import { Link } from "react-aria-components";
import { Breadcrumb, Breadcrumbs } from "./Breadcrumb";

const meta = {
  title: "Design System/Breadcrumb",
  component: Breadcrumbs,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;

// Basic usage story
export const Basic = {
  render: () => (
    <Breadcrumbs>
      <Breadcrumb>Home</Breadcrumb>
    </Breadcrumbs>
  ),
};

// With link
export const WithLink = {
  render: () => (
    <Breadcrumbs>
      <Breadcrumb>
        <Link href="/">Home</Link>
      </Breadcrumb>
    </Breadcrumbs>
  ),
};
