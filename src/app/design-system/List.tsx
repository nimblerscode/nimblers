"use client";

import type React from "react";
import { styled } from "../../../styled-system/jsx";
import type { SystemStyleObject } from "../../../styled-system/types";

// Define the allowed list types explicitly
export type ListElementType = "ul" | "ol";

// Define own props for the List component, generic over the element type E
interface ListOwnProps<E extends ListElementType = "ul"> {
  /**
   * The type of list to render.
   * @default "ul"
   */
  as?: E;
  /**
   * Spacing between list items. Applied as a gap to the list container.
   * Uses theme spacing tokens.
   * @default "0"
   */
  spacing?: SystemStyleObject["gap"];
  /**
   * Custom CSS styles.
   */
  css?: SystemStyleObject;
  children?: React.ReactNode; // children is a common prop
  className?: string; // Explicitly include className
}

// Combine ListOwnProps with React's standard HTML attributes for element E
// Omit own props from React.ComponentPropsWithoutRef to avoid conflicts
export type ListProps<E extends ListElementType = "ul"> = ListOwnProps<E> &
  Omit<React.ComponentPropsWithoutRef<E>, keyof ListOwnProps<E>>;

/**
 * List component that renders either a <ul> or <ol>.
 * Provides basic styling reset and spacing for list items.
 */
export const List = <E extends ListElementType = "ul">(
  // Destructure props according to ListProps<E>
  {
    as,
    spacing = "0",
    children,
    className, // from ListOwnProps
    css: cssProp, // from ListOwnProps
    ...props // from Omit<React.ComponentPropsWithoutRef<E>, ...>
  }: ListProps<E>,
) => {
  const StyledList = styled("ul");

  return (
    // Apply Panda style props directly to the styled component
    // Standard HTML attributes are passed via {...props}
    // className and css are handled explicitly
    <StyledList
      className={className} // Pass standard className
      listStyleType="none"
      paddingLeft="0"
      marginLeft="0"
      display="flex"
      flexDirection="column"
      gap={spacing}
      css={cssProp} // Pass user-provided css object
      {...props} // Spread remaining HTML attributes for the element E
    >
      {children}
    </StyledList>
  );
};

// Set a displayName for easier debugging
List.displayName = "List";
