"use client";

import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  Dialog as AriaDialog,
  type DialogProps as AriaDialogProps,
  DialogTrigger as AriaDialogTrigger,
  Heading as AriaHeading,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
  type ModalOverlayProps as AriaModalOverlayProps,
} from "react-aria-components";
import { cva, cx } from "../../../styled-system/css";
import { Icon } from "./Icon";
import { Close } from "./icons";

// Overlay (backdrop) styling
const overlayStyles = cva({
  base: {
    position: "fixed",
    inset: "0",
    zIndex: "50",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bg: "black/50",
    p: "4",
    // Animation states
    "&[data-entering]": {
      animationDuration: "200ms",
      animationFillMode: "forwards",
      animationName: "fade-in",
    },
    "&[data-exiting]": {
      animationDuration: "150ms",
      animationFillMode: "forwards",
      animationName: "fade-out",
    },
  },
});

// Modal container styling
const modalStyles = cva({
  base: {
    position: "relative",
    bg: "white",
    borderRadius: "lg",
    boxShadow: "xl",
    outline: "none",
    maxH: "screen",
    overflow: "auto",
    // Animation states
    "&[data-entering]": {
      animationDuration: "200ms",
      animationFillMode: "forwards",
      animationName: "zoom-in",
    },
    "&[data-exiting]": {
      animationDuration: "150ms",
      animationFillMode: "forwards",
      animationName: "zoom-out",
    },
  },
  variants: {
    size: {
      sm: {
        maxW: "sm",
        w: "full",
      },
      md: {
        maxW: "md",
        w: "full",
      },
      lg: {
        maxW: "lg",
        w: "full",
      },
      xl: {
        maxW: "xl",
        w: "full",
      },
      "2xl": {
        maxW: "2xl",
        w: "full",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

// Dialog content styling
const dialogStyles = cva({
  base: {
    outline: "none",
    p: "6",
    display: "flex",
    flexDirection: "column",
    gap: "4",
  },
});

// Dialog header styling
const headerStyles = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4",
  },
});

// Dialog title styling
const titleStyles = cva({
  base: {
    fontSize: "lg",
    fontWeight: "semibold",
    color: "content.primary",
    lineHeight: "1.5",
    margin: "0",
  },
});

// Dialog body styling
const bodyStyles = cva({
  base: {
    flex: "1",
    color: "content.primary",
  },
});

// Dialog footer styling
const footerStyles = cva({
  base: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "3",
    pt: "4",
  },
});

// Close button styling
const closeButtonStyles = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    w: "8",
    h: "8",
    borderRadius: "sm",
    color: "content.secondary",
    bg: "transparent",
    border: "none",
    cursor: "pointer",
    outline: "none",
    transition: "all 0.2s ease-in-out",
    _hover: {
      bg: "border.subtle",
      color: "content.primary",
    },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "border.focus",
      outlineOffset: "2px",
    },
  },
});

// Component interfaces
export interface DialogOverlayProps extends AriaModalOverlayProps {
  className?: string;
}

export interface DialogModalProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  children: React.ReactNode;
}

export interface DialogContentProps extends AriaDialogProps {
  className?: string;
}

export interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogCloseButtonProps extends AriaButtonProps {
  className?: string;
}

// Component implementations
export function DialogOverlay({
  className,
  children,
  ...props
}: DialogOverlayProps) {
  return (
    <AriaModalOverlay className={cx(overlayStyles(), className)} {...props}>
      {children}
    </AriaModalOverlay>
  );
}

export function DialogModal({ size, className, children }: DialogModalProps) {
  return (
    <AriaModal className={cx(modalStyles({ size }), className)}>
      {children}
    </AriaModal>
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <AriaDialog className={cx(dialogStyles(), className)} {...props}>
      {children}
    </AriaDialog>
  );
}

export function DialogHeader({ className, children }: DialogHeaderProps) {
  return <div className={cx(headerStyles(), className)}>{children}</div>;
}

export function DialogTitle({ className, children }: DialogTitleProps) {
  return (
    <AriaHeading slot="title" className={cx(titleStyles(), className)}>
      {children}
    </AriaHeading>
  );
}

export function DialogBody({ className, children }: DialogBodyProps) {
  return <div className={cx(bodyStyles(), className)}>{children}</div>;
}

export function DialogFooter({ className, children }: DialogFooterProps) {
  return <div className={cx(footerStyles(), className)}>{children}</div>;
}

export function DialogCloseButton({
  className,
  children,
  ...props
}: DialogCloseButtonProps) {
  return (
    <AriaButton className={cx(closeButtonStyles(), className)} {...props}>
      {children || <Icon icon={Close} size={16} />}
    </AriaButton>
  );
}

// Compound component with trigger
export interface DialogTriggerProps {
  children: [React.ReactElement, React.ReactElement];
}

export function DialogTrigger({ children }: DialogTriggerProps) {
  return <AriaDialogTrigger>{children}</AriaDialogTrigger>;
}

// Complete dialog compound component
export interface DialogProps {
  trigger: React.ReactElement;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  children: (close: () => void) => React.ReactNode;
  overlayProps?: DialogOverlayProps;
  modalProps?: Omit<DialogModalProps, "size" | "children">;
  contentProps?: DialogContentProps;
  showCloseButton?: boolean;
}

export function Dialog({
  trigger,
  title,
  size = "md",
  children,
  overlayProps,
  modalProps,
  contentProps,
  showCloseButton = true,
}: DialogProps) {
  return (
    <DialogTrigger>
      {trigger}
      <DialogOverlay {...overlayProps}>
        <DialogModal size={size} {...modalProps}>
          <DialogContent {...contentProps}>
            {(renderProps) => (
              <>
                {(title || showCloseButton) && (
                  <DialogHeader>
                    {title && <DialogTitle>{title}</DialogTitle>}
                    {showCloseButton && (
                      <DialogCloseButton onPress={renderProps.close} />
                    )}
                  </DialogHeader>
                )}
                <DialogBody>{children(renderProps.close)}</DialogBody>
              </>
            )}
          </DialogContent>
        </DialogModal>
      </DialogOverlay>
    </DialogTrigger>
  );
}

// Export styles for external use
export {
  overlayStyles,
  modalStyles,
  dialogStyles,
  headerStyles,
  titleStyles,
  bodyStyles,
  footerStyles,
  closeButtonStyles,
};
