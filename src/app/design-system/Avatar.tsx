import type React from "react";
import { cva, type RecipeVariantProps } from "../../../styled-system/css";
import { Flex } from "./Layout";
import { Text } from "./Text";

const avatarStyles = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "full",
    fontWeight: "medium",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
  },
  variants: {
    size: {
      xs: { width: "6", height: "6", fontSize: "token(fontSizes.2xs)" },
      sm: { width: "8", height: "8", fontSize: "token(fontSizes.xs)" },
      md: { width: "10", height: "10", fontSize: "token(fontSizes.sm)" },
      lg: { width: "12", height: "12", fontSize: "token(fontSizes.base)" },
      xl: { width: "14", height: "14", fontSize: "token(fontSizes.lg)" },
    },
    colorScheme: {
      brand: {
        bg: "accent.600", // Use vibrant accent color
        color: "white", // White text on accent background
      },
      gray: {
        bg: "border.default",
        color: "content.primary",
      },
      // Add more color schemes as needed from your panda.config.ts (e.g., success, warning)
      success: {
        bg: "status.success.background",
        color: "status.success.text",
      },
      warning: {
        bg: "status.warning.background",
        color: "status.warning.text",
      },
      danger: {
        bg: "status.danger.background",
        color: "status.danger.text",
      },
    },
  },
  defaultVariants: {
    size: "md",
    colorScheme: "brand",
  },
});

export type AvatarProps = React.HTMLAttributes<HTMLDivElement> &
  RecipeVariantProps<typeof avatarStyles> & {
    name?: string;
    src?: string;
    alt?: string;
  };

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  alt,
  size,
  colorScheme,
  className,
  ...props
}) => {
  const initials = name
    ? name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  return (
    <Flex
      className={`${avatarStyles({ size, colorScheme })} ${className || ""}`}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt || name || "Avatar"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Text fontWeight="semibold" fontSize="inherit" color="inherit">
          {initials}
        </Text>
      )}
    </Flex>
  );
};
