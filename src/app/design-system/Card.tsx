"use client";

import { type HTMLStyledProps, styled } from "../../../styled-system/jsx";
import type { SystemStyleObject } from "../../../styled-system/types";
import { Heading } from "./Heading";
import { Box } from "./Layout";

// Root Card Component
export interface CardProps extends HTMLStyledProps<"div"> {
  /**
   * Allows for inline style overrides or additions using Panda's SystemStyleObject.
   */
  css?: SystemStyleObject;
}

/**
 * Card component
 *
 * A flexible and reusable content container with pre-defined styling according to the design system.
 * It applies base styles for background, border, border radius, and padding.
 * These can be overridden or extended using standard Panda CSS style props or the `css` prop.
 */
export const Card = ({ children, css: cssProp, ...props }: CardProps) => {
  return (
    <Box
      backgroundColor="surface.raised" // Uses semantic token for card backgrounds
      borderWidth="1px"
      borderColor="border.default" // Uses semantic token: border.default (default) or theme-specific
      borderRadius="sm"
      p="6" // Padding can be a spacing token
      {...props}
      css={cssProp}
    >
      {children}
    </Box>
  );
};

Card.displayName = "Card";

// CardHeader Component
export interface CardHeaderProps extends HTMLStyledProps<"div"> {
  css?: SystemStyleObject;
}

export const CardHeader = ({
  children,
  css: cssProp,
  ...props
}: CardHeaderProps) => {
  return (
    <styled.div
      // Example: borderBottomWidth="1px" borderColor="border.subtle"
      {...props}
      css={cssProp}
    >
      {children}
    </styled.div>
  );
};
CardHeader.displayName = "CardHeader";

// CardTitle Component
export interface CardTitleProps extends HTMLStyledProps<"h3"> {
  css?: SystemStyleObject;
}

export const CardTitle = ({
  children,
  css: cssProp,
  ...props
}: CardTitleProps) => {
  return (
    <Heading
      as="h3"
      levelStyle="h3"
      color="content.primary"
      {...props}
      css={cssProp}
    >
      {children}
    </Heading>
  );
};
CardTitle.displayName = "CardTitle";

// CardDescription Component
export interface CardDescriptionProps extends HTMLStyledProps<"p"> {
  css?: SystemStyleObject;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  children,
  css: cssProp,
  ...props
}) => {
  return (
    <styled.p
      fontSize="sm"
      color="content.secondary" // Uses semantic token for secondary text color
      {...props}
      css={cssProp}
    >
      {children}
    </styled.p>
  );
};
CardDescription.displayName = "CardDescription";

// CardContent Component
export interface CardContentProps extends HTMLStyledProps<"div"> {
  css?: SystemStyleObject;
}

export const CardContent = ({
  children,
  css: cssProp,
  ...props
}: CardContentProps) => {
  return (
    <Box {...props} css={cssProp} fontSize="sm">
      {children}
    </Box>
  );
};
CardContent.displayName = "CardContent";
