"use client";

import type React from "react";
import { useState } from "react";
import { cva, cx, type RecipeVariantProps } from "../../../styled-system/css";
import { Box, type HTMLStyledProps, styled } from "../../../styled-system/jsx";
import type { SystemStyleObject } from "../../../styled-system/types";
import {
  Close as CloseButtonIcon, // Renamed to avoid confusion with a potential Close component
  XCircle as DangerIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  AlertTriangle as WarningIcon,
} from "./icons"; // Import from the new icons file

const bannerStyles = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    padding: "4",
    borderWidth: "thin",
    borderStyle: "solid",
    borderRadius: "sm",
    width: "full",
  },
  variants: {
    variant: {
      info: {
        backgroundColor: "status.info.background",
        borderColor: "status.info.border",
        color: "status.info.text",
      },
      success: {
        backgroundColor: "status.success.background",
        borderColor: "status.success.border",
        color: "status.success.text",
      },
      warning: {
        backgroundColor: "status.warning.background",
        borderColor: "status.warning.border",
        color: "status.warning.text",
      },
      danger: {
        backgroundColor: "status.danger.background",
        borderColor: "status.danger.border",
        color: "status.danger.text",
      },
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

export type BannerStyleProps = RecipeVariantProps<typeof bannerStyles>;

export interface BannerProps extends Omit<HTMLStyledProps<"div">, "title"> {
  variant?: BannerStyleProps["variant"];
  title?: React.ReactNode; // Allow ReactNode for title for more flexibility
  icon?: React.ReactNode | boolean;
  isDismissible?: boolean;
  onDismiss?: () => void;
  children: React.ReactNode;
  css?: SystemStyleObject;
}

// Cast to a more specific key type if BannerStyleProps["variant"] is problematic
type BannerVariant = keyof typeof bannerStyles.variants.variant;

const defaultIcons: Record<BannerVariant, React.ReactNode> = {
  info: <InfoIcon size={16} aria-hidden="true" />,
  success: <SuccessIcon size={16} aria-hidden="true" />,
  warning: <WarningIcon size={16} aria-hidden="true" />,
  danger: <DangerIcon size={16} aria-hidden="true" />,
};

export const Banner: React.FC<BannerProps> = ({
  variant = "info",
  title,
  icon,
  isDismissible,
  onDismiss,
  children,
  className,
  css: cssProp,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const currentIcon =
    icon === true
      ? defaultIcons[variant as BannerVariant]
      : icon // if icon is ReactNode
        ? icon
        : null; // if icon is false or undefined

  const TitleComponent = typeof title === "string" ? styled("h3") : Box;
  // ^ If title is string, render as h3, else as Box (for custom ReactNode title)

  return (
    <styled.div
      className={cx(bannerStyles({ variant }), className)}
      display="flex"
      alignItems="flex-start"
      {...props}
      css={cssProp}
    >
      {currentIcon && (
        <styled.span
          marginRight="sm" // Use theme token
          flexShrink={0}
          paddingTop="0.5" // Minor adjustment for typical 16px icon
          // aria-hidden is now on the icon component itself
        >
          {currentIcon}
        </styled.span>
      )}
      <Box flexGrow={1}>
        {title && (
          <TitleComponent
            fontWeight="semibold"
            fontSize="md"
            lineHeight="normal" // Added for consistency
            marginBottom={children ? "xs" : "0"} // Use theme token
            // color is inherited from Flex via CVA
          >
            {title}
          </TitleComponent>
        )}
        {typeof children === "string" ? (
          <styled.p color="inherit" margin="0">
            {children}
          </styled.p>
        ) : (
          children
        )}
      </Box>
      {isDismissible && (
        <styled.button
          type="button"
          aria-label="Dismiss banner"
          onClick={handleDismiss}
          marginLeft="sm" // Use theme token
          paddingTop="0.5" // Minor adjustment for alignment
          paddingX="0.5" // Added some horizontal padding for easier click
          flexShrink={0}
          appearance="none"
          background="transparent"
          border="none"
          cursor="pointer"
          color="inherit"
          borderRadius="sm" // Added for better focus visibility if a ring is applied
          _hover={{ opacity: 0.7 }}
          _focusVisible={{
            outline: "2px solid {colors.focusRing.default}",
            outlineOffset: "1px",
          }} // Added focus style
        >
          <CloseButtonIcon size={16} aria-hidden="true" />
        </styled.button>
      )}
    </styled.div>
  );
};

Banner.displayName = "Banner";
