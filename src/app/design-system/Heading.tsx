"use client";

import { cva, cx, type RecipeVariantProps } from "../../../styled-system/css";
import { type HTMLStyledProps, styled } from "../../../styled-system/jsx";
import type { SystemStyleObject } from "../../../styled-system/types";

const headingStyles = cva({
  base: {
    fontFamily: "heading",
    color: "content.primary",
    lineHeight: "1",
    // Common margin reset, specific margins per level will be in variants
    marginTop: "0",
    marginBottom: "0",
  },
  variants: {
    level: {
      h1: {
        fontSize: "3xl",
        fontWeight: "bold",
      },
      h2: {
        fontSize: "2xl",
        fontWeight: "bold",
      },
      h3: {
        fontSize: "xl",
        fontWeight: "bold",
      },
      h4: {
        fontSize: "lg",
        fontWeight: "semibold",
      },
      h5: {
        fontSize: "md",
        fontWeight: "500",
      },
      h6: {
        fontSize: "sm",
        fontWeight: "normal",
      },
    },
  },
  defaultVariants: {
    level: "h1",
  },
});

export type HeadingStyleProps = RecipeVariantProps<typeof headingStyles>;

type HeadingElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

// Explicitly define the type for the 'level' variant values, which matches HeadingElement
type HeadingLevelVariant = HeadingElement;

export interface HeadingProps extends HTMLStyledProps<HeadingElement> {
  /**
   * The HTML heading element to render.
   * This also determines the default styling level if `levelStyle` is not provided.
   */
  as: HeadingElement;
  /**
   * Optional: Explicitly set the styling level (e.g., "h1" style for an `as="h2"` element).
   * Defaults to the level corresponding to the `as` prop.
   */
  levelStyle?: HeadingLevelVariant;
  /**
   * Panda CSS style props for custom styling overrides.
   */
  css?: SystemStyleObject;
  // className is inherited from HTMLStyledProps
}

/**
 * A component for rendering semantic HTML heading elements (h1-h6)
 * with pre-defined, theme-aware styles.
 */
export const Heading: React.FC<HeadingProps> = ({
  as: Component, // Component is one of "h1"-"h6"
  levelStyle,
  children,
  className, // This is the external className passed to <Heading ... />
  css: cssProp,
  ...props
}) => {
  // `Component` itself is already of type HeadingLevelVariant ("h1" | "h2" | ...)
  const resolvedLevel: HeadingLevelVariant = levelStyle || Component;

  const StyledHeading = styled(Component);

  return (
    <StyledHeading
      // Use cx to merge CVA styles with any passed className prop
      className={cx(headingStyles({ level: resolvedLevel }), className)}
      {...props} // Spread remaining props (like id, aria-label, etc.)
      css={cssProp} // Apply custom CSS overrides
    >
      {children}
    </StyledHeading>
  );
};

Heading.displayName = "Heading";
