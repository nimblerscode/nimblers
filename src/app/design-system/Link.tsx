import React from "react";
import {
  Link as AriaLink,
  type LinkProps as AriaLinkProps,
} from "react-aria-components";
import { cva, cx } from "../../../styled-system/css";
import type { SystemStyleObject } from "../../../styled-system/types";
import { ExternalLink } from "./icons";

const linkStyles = cva({
  base: {
    textDecoration: "none",
    transition: "colors 0.2s ease-in-out",
    color: "link.default",
    fontWeight: "bold",
    cursor: "pointer",
    _hover: {
      color: "link.hover",
      textDecoration: "underline",
    },
    _focus: {
      ring: "focusRing.default solid 2px",
      ringOffset: "0.5",
      borderRadius: "sm",
    },
    _focusVisible: {
      ring: "focusRing.default solid 2px",
      ringOffset: "0.5",
      borderRadius: "sm",
    },
  },
  variants: {
    variant: {
      breadcrumb: {
        color: "gray.500",
        fontWeight: "500",
        fontSize: "sm",
        _hover: {
          color: "gray.700",
          textDecoration: "none",
        },
      },
    },
  },
});

export interface LinkProps
  extends Omit<AriaLinkProps, "className" | "style" | "href"> {
  href: string;
  children: React.ReactNode;
  className?: string;
  isExternal?: boolean;
  showExternalIcon?: boolean;
  css?: SystemStyleObject;
  variants?: "breadcrumb";
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  (
    {
      href,
      children,
      className,
      isExternal,
      showExternalIcon = true,
      css,
      ...props
    },
    ref,
  ) => {
    const finalIsExternal =
      typeof isExternal === "boolean"
        ? isExternal
        : /^((https?:)?\/\/|mailto:|tel:)/.test(href);

    const composedClassName = cx(
      linkStyles({ variant: props.variants }),
      css ? cva({ base: css })() : "",
      className,
    );

    const content = (
      <>
        {children}
        {finalIsExternal && showExternalIcon && (
          <ExternalLink
            size="0.8em"
            style={{
              display: "inline-block",
              verticalAlign: "middle",
            }}
            aria-label="(opens in a new tab)"
          />
        )}
      </>
    );

    return (
      <AriaLink
        {...props}
        href={href}
        target={finalIsExternal ? "_blank" : undefined}
        rel={finalIsExternal ? "noopener noreferrer" : undefined}
        ref={ref}
        className={composedClassName}
        data-testid={finalIsExternal ? "external-link" : "internal-link"}
      >
        {content}
      </AriaLink>
    );
  },
);

Link.displayName = "Link";
