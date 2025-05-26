"use client";

import {
  Button as AriaButton,
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  Popover as AriaPopover,
  Select as AriaSelect,
  type SelectProps as AriaSelectProps,
  SelectValue as AriaSelectValue,
  Header,
  type ListBoxItemProps,
  type PopoverProps,
  Separator,
} from "react-aria-components";
import { cva, cx } from "../../../styled-system/css";
import { VStack } from "../../../styled-system/jsx";
import { Icon } from "./Icon";
import { Label } from "./Input";
import { ChevronDown } from "./icons";

// Select trigger styling
const selectStyles = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "full",
    minWidth: 0,
    appearance: "none",
    bg: "white",
    color: "content.primary",
    borderWidth: "thin",
    borderColor: "border.default",
    borderRadius: "sm",
    px: "3",
    py: "2",
    fontSize: "md",
    lineHeight: "normal",
    outline: "none",
    cursor: "pointer",
    transition: "border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
    _hover: {
      borderColor: "border.strong",
    },
    _focusVisible: {
      ring: "2px solid",
      ringColor: "focusRing.default",
      ringOffset: "1px",
      borderColor: "border.focus",
    },
    _disabled: {
      backgroundColor: "disabled.background",
      color: "disabled.foreground",
      borderColor: "disabled.border",
      cursor: "not-allowed",
      _hover: {
        borderColor: "disabled.border",
      },
    },
    "&[data-invalid='true']": {
      borderColor: "status.danger.border",
      _focusVisible: {
        outlineColor: "status.danger.solidHover",
        borderColor: "status.danger.border",
      },
    },
    "&[data-pressed]": {
      bg: "border.subtle",
    },
  },
  variants: {
    variantSize: {
      sm: { fontSize: "sm", px: "2.5", py: "1.5" },
      md: { fontSize: "md", px: "3", py: "2" },
      lg: { fontSize: "lg", px: "3.5", py: "2.5" },
    },
  },
  defaultVariants: {
    variantSize: "md",
  },
});

// Select value styling
const selectValueStyles = cva({
  base: {
    flex: "1",
    textAlign: "left",
    color: "content.primary",
    "&[data-placeholder]": {
      color: "content.secondary",
      opacity: 0.7,
    },
  },
});

// Select icon styling
const selectIconStyles = cva({
  base: {
    ml: "2",
    color: "content.secondary",
    flexShrink: "0",
  },
});

// Popover styling
const popoverStyles = cva({
  base: {
    zIndex: "50",
    minW: "var(--trigger-width)",
    bg: "white",
    borderWidth: "thin",
    borderColor: "border.default",
    borderRadius: "sm",
    boxShadow: "lg",
    outline: "none",
    overflow: "hidden",
    "&[data-entering]": {
      animationDuration: "150ms",
      animationFillMode: "forwards",
      animationName: "fade-in-scale",
    },
    "&[data-exiting]": {
      animationDuration: "100ms",
      animationFillMode: "forwards",
      animationName: "fade-out-scale",
    },
  },
});

// ListBox styling
const listBoxStyles = cva({
  base: {
    maxH: "60",
    overflow: "auto",
    outline: "none",
    p: "1",
  },
});

// ListBox item styling
const listBoxItemStyles = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    px: "3",
    py: "2",
    borderRadius: "sm",
    fontSize: "md",
    color: "content.primary",
    cursor: "pointer",
    outline: "none",
    userSelect: "none",
    transition: "all 0.2s ease-in-out",
    _hover: {
      bg: "border.subtle",
    },
    "&[data-focused]": {
      bg: "border.subtle",
      color: "content.primary",
      ring: "2px solid",
      ringColor: "focusRing.default",
      ringOffset: "1px",
    },
    "&[data-selected]": {
      bg: "border.default",
      color: "content.primary",
      _hover: {
        bg: "border.strong",
      },
    },
    "&[data-disabled]": {
      color: "disabled.foreground",
      cursor: "not-allowed",
      _hover: {
        bg: "transparent",
      },
    },
  },
});

// Section header styling
const sectionHeaderStyles = cva({
  base: {
    px: "3",
    py: "2",
    fontSize: "sm",
    fontWeight: "semibold",
    color: "content.secondary",
    textTransform: "uppercase",
    letterSpacing: "wider",
  },
});

// Separator styling
const separatorStyles = cva({
  base: {
    my: "1",
    mx: "1",
    h: "px",
    bg: "border.default",
  },
});

// Component interfaces
export interface SelectItem {
  id: string;
  label: string;
  value?: string;
  disabled?: boolean;
}

export interface SelectSection {
  id: string;
  label?: string;
  items: SelectItem[];
}

export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, "children"> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validationErrors: string[]) => string);
  placeholder?: string;
  variantSize?: "sm" | "md" | "lg";
  items?: Iterable<T>;
  children?: React.ReactNode | ((item: T) => React.ReactNode);
  className?: string;
  popoverProps?: Omit<PopoverProps, "children">;
  labelProps?: React.ComponentProps<typeof Label>;
}

export interface SelectItemProps extends ListBoxItemProps {
  className?: string;
}

// Component implementations
export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <AriaListBoxItem className={cx(listBoxItemStyles(), className)} {...props}>
      {(renderProps) => (
        <span>
          {typeof children === "function" ? children(renderProps) : children}
        </span>
      )}
    </AriaListBoxItem>
  );
}

export function SelectSeparator({ className }: { className?: string }) {
  return <Separator className={cx(separatorStyles(), className)} />;
}

export function SelectHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Header className={cx(sectionHeaderStyles(), className)}>{children}</Header>
  );
}

export function Select<T extends object>({
  label,
  description,
  errorMessage,
  placeholder,
  variantSize = "md",
  items,
  children,
  className,
  popoverProps,
  labelProps,
  ...props
}: SelectProps<T>) {
  return (
    <AriaSelect className={className} {...props}>
      {(renderProps) => (
        <VStack gap="2" alignItems="flex-start">
          {label && <Label {...labelProps}>{label}</Label>}
          <AriaButton className={selectStyles({ variantSize })}>
            <AriaSelectValue className={selectValueStyles()}>
              {({ selectedText }) => selectedText || placeholder}
            </AriaSelectValue>
            <Icon
              icon={ChevronDown}
              size={16}
              className={cx(
                selectIconStyles(),
                "transition-transform duration-200",
                renderProps.isOpen && "rotate-180",
              )}
            />
          </AriaButton>

          <AriaPopover className={popoverStyles()} {...popoverProps}>
            <AriaListBox className={listBoxStyles()} items={items}>
              {children}
            </AriaListBox>
          </AriaPopover>

          {description && !renderProps.isInvalid && (
            <div className="text-sm text-content-secondary mt-1">
              {description}
            </div>
          )}

          {errorMessage && renderProps.isInvalid && (
            <div className="text-sm text-status-danger-text font-medium mt-1">
              {typeof errorMessage === "function"
                ? errorMessage((renderProps as any).validationErrors)
                : errorMessage}
            </div>
          )}
        </VStack>
      )}
    </AriaSelect>
  );
}

// Export styles for external use
export {
  selectStyles,
  selectValueStyles,
  selectIconStyles,
  popoverStyles,
  listBoxStyles,
  listBoxItemStyles,
  sectionHeaderStyles,
  separatorStyles,
};
