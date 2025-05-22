"use client";

import type { ElementType } from "react";
import { Text as AriaText } from "react-aria-components";
import { type HTMLStyledProps, styled } from "../../../styled-system/jsx";
import type { SystemStyleObject } from "../../../styled-system/types";

export interface TextProps extends HTMLStyledProps<"p"> {
  /**
   * The HTML element to render the text as.
   * @default "p"
   */
  as?: ElementType;
  /**
   * Panda CSS style props for custom styling.
   */
  css?: SystemStyleObject;
  // We can add specific prop variants later if common text styles emerge,
  // e.g., variant="heading1" | "body" | "caption"
  // For now, flexibility through direct style props and `as` prop is prioritized.
}

/**
 * A general-purpose Text component for rendering text with theme-aware styles.
 * Defaults to rendering a <p> tag but can be changed using the `as` prop.
 * Applies base text color and allows overriding via `color` prop or `css` prop.
 */
export const Text = ({
  as: Component = "p",
  children,
  className,
  color = "content.primary", // Default to primary text color from semantic tokens
  css: cssProp,
  ...props
}: TextProps) => {
  // `styled` factory expects the first argument to be a string literal for intrinsic elements
  // or a component. For dynamic `as` prop, we create the styled component dynamically.
  const StyledComponent = styled(Component);

  return (
    <StyledComponent
      className={className}
      color={color}
      {...props}
      css={cssProp}
    >
      <AriaText slot={props.slot}>{children}</AriaText>
    </StyledComponent>
  );
};

Text.displayName = "Text";
