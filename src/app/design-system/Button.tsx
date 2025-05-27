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
      "background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out, box-shadow 0.2s ease-in-out, transform 0.1s ease-in-out",
    width: "full",
    _focusVisible: {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: "border.focus",
      outlineOffset: "2px",
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
          borderColor: "brand.solidHover",
        },
        _active: {
          backgroundColor: "brand.solidHover",
          transform: "scale(0.98)",
        },
        _focusVisible: {
          outlineColor: "brand.solid",
          outlineOffset: "2px",
        },
        _disabled: {
          backgroundColor: "disabled.background",
          color: "disabled.foreground",
          borderColor: "disabled.border",
          cursor: "not-allowed",
        },
      },
      secondary: {
        backgroundColor: "surface.base",
        color: "content.primary",
        borderColor: "border.default",
        _hover: {
          backgroundColor: "border.subtle",
          borderColor: "border.strong",
        },
        _active: {
          backgroundColor: "border.default",
          transform: "scale(0.98)",
        },
        _focusVisible: {
          outlineColor: "border.focus",
          borderColor: "border.focus",
          outlineOffset: "2px",
        },
        _disabled: {
          backgroundColor: "disabled.background",
          color: "disabled.foreground",
          borderColor: "disabled.border",
          cursor: "not-allowed",
        },
      },
      outline: {
        backgroundColor: "transparent",
        color: "brand.solid",
        borderColor: "brand.solid",
        _hover: {
          backgroundColor: "brand.background",
          color: "brand.solidHover",
          borderColor: "brand.solidHover",
        },
        _active: {
          backgroundColor: "brand.subtle",
          color: "brand.solidHover",
          borderColor: "brand.solidHover",
          transform: "scale(0.98)",
        },
        _focusVisible: {
          outlineColor: "brand.solid",
          outlineOffset: "2px",
        },
        _disabled: {
          backgroundColor: "transparent",
          color: "disabled.foreground",
          borderColor: "disabled.border",
          cursor: "not-allowed",
        },
      },
      danger: {
        backgroundColor: "status.danger.solid",
        color: "status.danger.onSolid",
        borderColor: "status.danger.solid",
        _hover: {
          backgroundColor: "status.danger.solidHover",
          borderColor: "status.danger.solidHover",
        },
        _active: {
          backgroundColor: "status.danger.solidHover",
          transform: "scale(0.98)",
        },
        _focusVisible: {
          outlineColor: "status.danger.solid",
          outlineOffset: "2px",
        },
        _disabled: {
          backgroundColor: "disabled.background",
          color: "disabled.foreground",
          borderColor: "disabled.border",
          cursor: "not-allowed",
        },
      },
      ghost: {
        backgroundColor: "transparent",
        color: "content.primary",
        borderColor: "transparent",
        _hover: {
          backgroundColor: "border.subtle",
          color: "content.primary",
        },
        _active: {
          backgroundColor: "border.default",
          transform: "scale(0.98)",
        },
        _focusVisible: {
          outlineColor: "border.focus",
          outlineOffset: "2px",
        },
        _disabled: {
          backgroundColor: "transparent",
          color: "disabled.foreground",
          borderColor: "transparent",
          cursor: "not-allowed",
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
