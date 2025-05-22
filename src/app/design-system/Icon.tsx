"use client";

import type { LucideProps } from "lucide-react";
import type React from "react";
import type { HTMLStyledProps } from "../../../styled-system/jsx";
import { type Token, token } from "../../../styled-system/tokens";
import type { SystemStyleObject } from "../../../styled-system/types";

interface BaseIconProps {
  /**
   * The icon component to render (e.g., Info, CheckCircle from lucide-react).
   */
  icon: React.ElementType<LucideProps>;
  /**
   * Panda CSS color token for the icon's stroke color.
   * Defaults to 'currentColor' if not provided, allowing inheritance.
   */
  color?: Token;
  /**
   * Panda CSS color token for the icon's fill color.
   * Defaults to 'none' if not provided.
   */
  fillColor?: Token;
  /**
   * Size of the icon. Can be a theme token key (e.g., 'sm', 'md') if you define iconSizes,
   * or a number (pixels), or a CSS string (e.g., '1.5em').
   * Lucide icons also accept a 'size' prop directly.
   */
  size?: string | number;
}

// Explicitly define IconProps to avoid conflicting css prop types
export interface IconProps
  extends BaseIconProps,
    // Pick up all HTMLStyledProps<"span"> except 'color' (to avoid conflict with colorToken) and 'css' (to define it once)
    Omit<HTMLStyledProps<"span">, "color" | "css"> {
  /**
   * Panda CSS SystemStyleObject for custom styling.
   * This is the standard css prop from Panda.
   */
  css?: SystemStyleObject;
}

export const Icon = ({
  icon: IconComponent,
  color, // Will be passed to wrapper's `stroke` style prop
  fillColor, // Will be passed to wrapper's `fill` style prop
  size = 24,
  className,
}: IconProps) => {
  return (
    <IconComponent
      className={className}
      size={size}
      stroke={color ? token(color) : "currentColor"}
      fill={fillColor ? token(fillColor) : "none"}
    />
  );
};

Icon.displayName = "Icon";
