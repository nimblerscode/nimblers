"use client";

import type React from "react";
import { cva, cx, type RecipeVariant } from "../../../styled-system/css";
import { type HTMLStyledProps, styled } from "../../../styled-system/jsx";

const pillStyles = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "xs",
    fontWeight: "medium",
    borderRadius: "full",
    px: "2",
    py: "0.5",
    lineHeight: "normal",
    whiteSpace: "nowrap",
  },
  variants: {
    variant: {
      brand: {
        bg: "brand.background",
        color: "brand.solid",
      },
      success: {
        bg: "status.success.subtleBg",
        color: "status.success.text",
      },
      warning: {
        bg: "status.warning.subtleBg",
        color: "status.warning.text",
      },
      danger: {
        bg: "status.danger.subtleBg",
        color: "status.danger.text",
      },
      info: {
        bg: "status.info.subtleBg",
        color: "status.info.solid",
      },
      discount: {
        bg: "status.success.solid",
        color: "status.success.onSolid",
      },
      recommended: {
        bg: "brand.solid",
        color: "brand.onSolid",
      },
    },
    size: {
      sm: {
        fontSize: "2xs",
        px: "1.5",
        py: "0.5",
      },
      md: {
        fontSize: "xs",
        px: "2",
        py: "0.5",
      },
      lg: {
        fontSize: "sm",
        px: "2.5",
        py: "1",
      },
    },
  },
  defaultVariants: {
    variant: "brand",
    size: "md",
  },
});

export type PillVariant = NonNullable<
  RecipeVariant<typeof pillStyles>["variant"]
>;
export type PillSize = NonNullable<RecipeVariant<typeof pillStyles>["size"]>;

export interface PillProps extends HTMLStyledProps<"span"> {
  variant: PillVariant;
  size: PillSize;
  children: React.ReactNode;
}

export const Pill = ({
  variant,
  size,
  children,
  className,
  ...props
}: PillProps) => {
  return (
    <styled.span
      className={cx(pillStyles({ variant, size }), className)}
      {...props}
    >
      {children}
    </styled.span>
  );
};

Pill.displayName = "Pill";
