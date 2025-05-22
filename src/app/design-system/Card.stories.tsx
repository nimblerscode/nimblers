import { styled } from "../../../styled-system/jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  type CardProps,
  CardTitle,
} from "./Card";

const meta = {
  title: "Design System/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    // We don't control children directly for the root Card anymore in the same way.
    // Specific stories will demonstrate composition.
  },
  // Default args are less relevant for the root Card now, focus on composition in stories.
};

export default meta;

export const Default = {
  args: {},
  render: (args: CardProps) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Default Card</CardTitle>
        <CardDescription>
          This card uses the default styling and structure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <styled.p>
          This is the main content area of the card. You can put any React nodes
          here.
        </styled.p>
      </CardContent>
    </Card>
  ),
};

export const WithOnlyContent = {
  args: {},
  render: (args: CardProps) => (
    <Card {...args}>
      <CardContent>
        <styled.p>
          This card only has a content section. Useful for simple information
          display.
        </styled.p>
      </CardContent>
    </Card>
  ),
};

export const WithCustomHeaderStyling = {
  args: {},
  render: (args: CardProps) => (
    <Card {...args}>
      <CardHeader
        css={{
          bg: "blue.50",
          borderBottom: "1px solid",
          borderColor: "blue.200",
        }}
      >
        <CardTitle css={{ color: "blue.700" }}>Custom Header Styling</CardTitle>
        <CardDescription css={{ color: "blue.600" }}>
          The header of this card has custom background and text colors.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <styled.p>The content area remains standard.</styled.p>
      </CardContent>
    </Card>
  ),
};

export const WithStyledContent = {
  args: {},
  render: (args: CardProps) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Card with Styled Content</CardTitle>
        <CardDescription>
          The content section of this card has specific styles.
        </CardDescription>
      </CardHeader>
      <CardContent
        css={{ bg: "gray.50", borderRadius: "md", boxShadow: "inner" }}
      >
        <styled.h4 fontWeight="semibold" mb="2">
          Content Title
        </styled.h4>
        <styled.p fontSize="sm" color="gray.700">
          This content area has a light gray background, rounded corners, and an
          inner shadow.
        </styled.p>
      </CardContent>
    </Card>
  ),
};

export const CompactCard = {
  args: {},
  render: (args: CardProps) => (
    <Card {...args} css={{ maxWidth: "400px" }}>
      <CardHeader p="4">
        {" "}
        {/* Reduced padding for header */}
        <CardTitle fontSize="md">Compact Card</CardTitle>
        <CardDescription fontSize="xs">
          A more compact version of the card.
        </CardDescription>
      </CardHeader>
      <CardContent p="4">
        {" "}
        {/* Reduced padding for content */}
        <styled.p fontSize="sm">
          This card is designed to take up less space, with reduced padding in
          its sections.
        </styled.p>
      </CardContent>
    </Card>
  ),
};

export const CardWithImageAndText = {
  args: {},
  render: (args: CardProps) => (
    <Card {...args} css={{ maxWidth: "400px" }}>
      {/* No CardHeader, image directly in Card if it spans full width */}
      <styled.img
        src="https://via.placeholder.com/400x150"
        alt="Placeholder content"
        width="100%"
        display="block"
        borderTopRadius="inherit" // If card has rounded corners
      />
      <CardContent>
        <CardTitle>Image Card</CardTitle>
        <CardDescription>
          This card features an image at the top.
        </CardDescription>
        <styled.p mt="4">
          Further details about the image or related content can go here.
        </styled.p>
      </CardContent>
    </Card>
  ),
};
