"use client";

import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components";
import { cva } from "../../../styled-system/css"; // Path to your Panda CSS cva function

const buttonStyles = cva({
  base: {
    display: "inline-flex", // Ensures proper alignment and sizing
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontWeight: "semibold", // Changed from bold for potentially more nuanced theming
    borderRadius: "sm", // Uses theme.radii.md
    borderWidth: "thin", // Uses theme.borderWidths.thin
    borderColor: "transparent", // Default to transparent, variants will override
    transition:
      "background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
    width: "full",
    _focusVisible: {
      outlineWidth: "medium",
      outlineStyle: "solid",
      outlineColor: "border.focus",
      outlineOffset: "0.5",
    },
    _disabled: {
      backgroundColor: "border.subtle",
      color: "content.subtle",
      borderColor: "border.subtle",
      cursor: "not-allowed",
    },
    // NO MARGINS HERE
  },
  variants: {
    variant: {
      primary: {
        backgroundColor: "brand.solid",
        color: "brand.onSolid",
        borderColor: "brand.solid",
        _hover: {
          backgroundColor: "brand.solidHover",
        },
        _active: {
          transform: "scale(0.98)",
        },
      },
      secondary: {
        backgroundColor: "page.background",
        color: "content.primary",
        borderColor: "border.default",
        _hover: {
          backgroundColor: "border.subtle",
        },
        _active: {
          transform: "scale(0.98)",
        },
      },
      outline: {
        backgroundColor: "transparent",
        color: "brand.solid",
        borderColor: "brand.solid",
        _hover: {
          backgroundColor: "brand.solid/10",
          color: "brand.solidHover",
        },
        _active: {
          backgroundColor: "brand.solid/20",
          transform: "scale(0.98)",
        },
      },
      danger: {
        backgroundColor: "status.danger.solid",
        color: "status.danger.onSolid",
        borderColor: "status.danger.solid",
        _hover: {
          backgroundColor: "status.danger.solidHover",
        },
        _active: {
          transform: "scale(0.98)",
        },
        _focusVisible: {
          outlineColor: "status.danger.border",
        },
      },
      ghost: {
        backgroundColor: "transparent",
        color: "content.primary",
        borderColor: "transparent",
        _hover: {
          backgroundColor: "border.subtle",
        },
        _active: {
          transform: "scale(0.98)",
        },
      },
    },
    size: {
      sm: {
        fontSize: "sm", // Uses theme.fontSizes.sm
        px: "3", // Uses theme.spacing[3]
        py: "1.5", // Uses theme.spacing[1.5]
        // minHeight ensure consistent height with text wrapping
        minHeight: "8", // Example: theme.spacing[8] = 2rem = 32px, adjust as needed
      },
      md: {
        fontSize: "md", // Uses theme.fontSizes.md
        px: "4", // Uses theme.spacing[4]
        py: "2", // Uses theme.spacing[2]
        minHeight: "10", // Example: theme.spacing[10] = 2.5rem = 40px
      },
      lg: {
        fontSize: "lg", // Uses theme.fontSizes.lg
        px: "5", // Uses theme.spacing[5]
        py: "2.5", // Uses theme.spacing[2.5]
        minHeight: "12", // Example: theme.spacing[12] = 3rem = 48px
      },
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export interface ButtonProps extends AriaButtonProps {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Button({
  variant,
  size,
  className,
  children,
  ...props
}: ButtonProps) {
  const cvaStyles = buttonStyles({ variant, size });
  const finalClassName = className ? `${cvaStyles} ${className}` : cvaStyles;

  return (
    <AriaButton className={finalClassName} {...props}>
      {children}
    </AriaButton>
  );
}

export { buttonStyles as buttonCva };
