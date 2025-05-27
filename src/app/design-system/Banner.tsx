"use client";

import type React from "react";
import { useState } from "react";
import { cva, cx, type RecipeVariantProps } from "../../../styled-system/css";
import { type HTMLStyledProps, styled } from "../../../styled-system/jsx";
import type { SystemStyleObject } from "../../../styled-system/types";
import {
  Close as CloseButtonIcon,
  XCircle as DangerIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  AlertTriangle as WarningIcon,
} from "./icons";

const bannerStyles = cva({
  base: {
    display: "flex",
    alignItems: "flex-start",
    padding: "4",
    borderWidth: "1px",
    borderStyle: "solid",
    borderRadius: "lg",
    width: "full",
    position: "relative",
    boxShadow: "sm",
    transition: "all 0.2s ease-in-out",
  },
  variants: {
    variant: {
      info: {
        backgroundColor: "blue.50",
        borderColor: "blue.200",
        color: "blue.900",
        "& [data-banner-icon]": {
          color: "blue.600",
        },
      },
      success: {
        backgroundColor: "green.50",
        borderColor: "green.200",
        color: "green.900",
        "& [data-banner-icon]": {
          color: "green.600",
        },
      },
      warning: {
        backgroundColor: "amber.50",
        borderColor: "amber.200",
        color: "amber.900",
        "& [data-banner-icon]": {
          color: "amber.600",
        },
      },
      danger: {
        backgroundColor: "red.50",
        borderColor: "red.200",
        color: "red.900",
        "& [data-banner-icon]": {
          color: "red.600",
        },
      },
      error: {
        backgroundColor: "red.50",
        borderColor: "red.200",
        color: "red.900",
        "& [data-banner-icon]": {
          color: "red.600",
        },
      },
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

export type BannerStyleProps = RecipeVariantProps<typeof bannerStyles> & {
  variant?: "info" | "success" | "warning" | "danger" | "error";
};

export interface BannerProps extends Omit<HTMLStyledProps<"div">, "title"> {
  variant?: BannerStyleProps["variant"];
  title?: React.ReactNode;
  icon?: React.ReactNode | boolean;
  isDismissible?: boolean;
  onDismiss?: () => void;
  children: React.ReactNode;
  css?: SystemStyleObject;
  actions?: React.ReactNode;
}

type BannerVariant = "info" | "success" | "warning" | "danger" | "error";

const defaultIcons: Record<BannerVariant, React.ReactNode> = {
  info: <InfoIcon size={20} aria-hidden="true" data-banner-icon />,
  success: <SuccessIcon size={20} aria-hidden="true" data-banner-icon />,
  warning: <WarningIcon size={20} aria-hidden="true" data-banner-icon />,
  danger: <DangerIcon size={20} aria-hidden="true" data-banner-icon />,
  error: <DangerIcon size={20} aria-hidden="true" data-banner-icon />,
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
  actions,
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
      : icon
        ? icon
        : null;

  return (
    <styled.div
      className={cx(bannerStyles({ variant }), className)}
      {...props}
      css={cssProp}
    >
      {/* Icon */}
      {currentIcon && (
        <styled.div
          marginRight="3"
          flexShrink={0}
          paddingTop="0.5"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {currentIcon}
        </styled.div>
      )}

      {/* Content */}
      <styled.div flexGrow={1} minWidth={0}>
        {title && (
          <styled.div
            fontWeight="semibold"
            fontSize="sm"
            lineHeight="tight"
            marginBottom={children ? "1" : "0"}
            color="inherit"
          >
            {title}
          </styled.div>
        )}

        <styled.div
          fontSize="sm"
          lineHeight="relaxed"
          color="inherit"
          opacity={title ? 0.9 : 1}
        >
          {typeof children === "string" ? (
            <styled.p margin="0" color="inherit">
              {children}
            </styled.p>
          ) : (
            children
          )}
        </styled.div>

        {/* Actions */}
        {actions && (
          <styled.div
            marginTop="3"
            display="flex"
            gap="2"
            flexWrap="wrap"
            alignItems="center"
          >
            {actions}
          </styled.div>
        )}
      </styled.div>

      {/* Dismiss Button */}
      {isDismissible && (
        <styled.button
          type="button"
          aria-label="Dismiss banner"
          onClick={handleDismiss}
          marginLeft="3"
          flexShrink={0}
          appearance="none"
          background="transparent"
          border="none"
          cursor="pointer"
          color="inherit"
          borderRadius="md"
          padding="1"
          display="flex"
          alignItems="center"
          justifyContent="center"
          opacity={0.7}
          transition="opacity 0.2s ease-in-out"
          _hover={{ opacity: 1 }}
          _focusVisible={{
            outline: "2px solid currentColor",
            outlineOffset: "2px",
            opacity: 1,
          }}
        >
          <CloseButtonIcon size={16} aria-hidden="true" />
        </styled.button>
      )}
    </styled.div>
  );
};

Banner.displayName = "Banner";
