"use client";

import type React from "react";
import { type HTMLStyledProps, styled } from "../../../styled-system/jsx";
import type { SystemStyleObject } from "../../../styled-system/types";

export interface ListItemProps extends HTMLStyledProps<"li"> {
  /**
   * Optional custom icon to display before the list item content.
   */
  icon?: React.ReactNode;
  /**
   * Gap between the icon and the content.
   * Uses theme spacing tokens.
   * @default 2
   */
  iconGap?: SystemStyleObject["gap"]; // Allow any valid gap token
  /**
   * Vertical alignment of the icon with the text content.
   * @default "center"
   */
  iconAlignment?: SystemStyleObject["alignItems"];
  /**
   * Custom CSS styles.
   */
  css?: SystemStyleObject;
}

/**
 * ListItem component to be used within List.
 * Supports an optional icon and custom styling.
 */
export const ListItem = ({
  icon,
  iconGap = "2", // Default gap, e.g., 0.5rem
  iconAlignment = "center",
  children,
  className,
  css: cssProp,
  ...props
}: ListItemProps) => {
  const StyledLi = styled("li");
  const IconWrapper = styled("span"); // For the icon itself
  const ContentWrapper = styled("span"); // For the children content

  if (icon) {
    return (
      <StyledLi
        display="flex"
        alignItems={iconAlignment}
        gap={iconGap} // This gap is between icon and content wrapper
        className={className}
        {...props}
        css={cssProp}
      >
        <IconWrapper display="flex" alignItems="center" flexShrink={0}>
          {icon}
        </IconWrapper>
        <ContentWrapper flexGrow={1}>{children}</ContentWrapper>
      </StyledLi>
    );
  }

  return (
    <StyledLi className={className} {...props} css={cssProp}>
      {children}
    </StyledLi>
  );
};

ListItem.displayName = "ListItem";
