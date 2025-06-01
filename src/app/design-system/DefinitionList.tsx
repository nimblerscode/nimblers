"use client";

import { Children } from "react";
import { type HTMLStyledProps, styled } from "../../../styled-system/jsx";
import type { SystemStyleObject } from "../../../styled-system/types";

// Props for the root DL component
export interface DefinitionListProps extends HTMLStyledProps<"dl"> {
  /**
   * Spacing between dt/dd groups
   * @default "6"
   */
  spacing?: SystemStyleObject["gap"];
  /**
   * Custom CSS styles
   */
  css?: SystemStyleObject;
}

// Props for the DT component
export interface DefinitionTermProps extends HTMLStyledProps<"dt"> {
  css?: SystemStyleObject;
}

// Props for the DD component
export interface DefinitionDescriptionProps extends HTMLStyledProps<"dd"> {
  css?: SystemStyleObject;
}

/**
 * DefinitionList component for displaying key-value pairs in a semantic way.
 * Uses HTML <dl>, <dt>, and <dd> elements under the hood.
 */
export const DefinitionList = ({
  spacing = "4",
  children,
  className,
  css: cssProp,
  ...props
}: DefinitionListProps) => {
  // Group children into pairs (dt/dd)
  const childArray = Children.toArray(children);
  const pairs = [];

  for (let i = 0; i < childArray.length; i += 2) {
    if (childArray[i + 1]) {
      pairs.push([childArray[i], childArray[i + 1]]);
    }
  }

  return (
    <styled.dl
      className={className}
      display="flex"
      flexDirection="column"
      gap={spacing}
      {...props}
      css={cssProp}
    >
      {pairs.map(([dt, dd], index) => {
        const dtKey = (dt as any).key ?? `dt-${index}`;
        const ddKey = (dd as any).key ?? `dd-${index}`;
        return (
          <styled.div
            key={`${dtKey}-${ddKey}`}
            display="flex"
            flexDirection="column"
            gap="1"
          >
            {[dt, dd]}
          </styled.div>
        );
      })}
    </styled.dl>
  );
};

/**
 * DefinitionTerm component for displaying the term/label in a definition list.
 */
export const DefinitionTerm = ({
  children,
  className,
  css: cssProp,
  ...props
}: DefinitionTermProps) => {
  return (
    <styled.dt
      className={className}
      color="content.subtle"
      fontSize="sm"
      fontWeight="medium"
      {...props}
      css={cssProp}
    >
      {children}
    </styled.dt>
  );
};

/**
 * DefinitionDescription component for displaying the description/value in a definition list.
 */
export const DefinitionDescription = ({
  children,
  className,
  css: cssProp,
  ...props
}: DefinitionDescriptionProps) => {
  return (
    <styled.dd
      className={className}
      color="content.primary"
      fontSize="sm"
      {...props}
      css={cssProp}
    >
      {children}
    </styled.dd>
  );
};

// Export a convenience object for better imports
export const DList = {
  Root: DefinitionList,
  Term: DefinitionTerm,
  Description: DefinitionDescription,
};
