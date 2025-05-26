"use client";

import type { LucideIcon } from "lucide-react";
import type React from "react";
import { createContext, useContext, useState } from "react";
import { cva } from "../../../styled-system/css";
import { Box, Flex, VStack } from "../../../styled-system/jsx";
import { Icon } from "./Icon";
import { ChevronLeft, ChevronRight, Menu } from "./icons";
import { Link } from "./Link";
import { Text } from "./Text";

// Context for sidebar state
interface SidebarContextType {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

// Sidebar container styles
const sidebarStyles = cva({
  base: {
    height: "100vh",
    backgroundColor: "page.background",
    borderRightWidth: "thin",
    borderRightColor: "border.default",
    transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    zIndex: 10,
  },
  variants: {
    collapsed: {
      true: {
        width: "16", // 64px
      },
      false: {
        width: "64", // 256px
      },
    },
  },
  defaultVariants: {
    collapsed: false,
  },
});

// Sidebar item styles
const sidebarItemStyles = cva({
  base: {
    display: "flex",
    alignItems: "center",
    width: "full",
    padding: "3",
    borderRadius: "md",
    transition: "all 0.2s ease-in-out",
    textDecoration: "none",
    color: "content.primary",
    cursor: "pointer",
    _hover: {
      backgroundColor: "border.subtle",
      color: "brand.solid",
    },
    _focusVisible: {
      outlineWidth: "medium",
      outlineStyle: "solid",
      outlineColor: "border.focus",
      outlineOffset: "1",
    },
  },
  variants: {
    active: {
      true: {
        backgroundColor: "brand.background",
        color: "brand.solid",
        fontWeight: "semibold",
      },
      false: {},
    },
    collapsed: {
      true: {
        justifyContent: "center",
        padding: "2",
      },
      false: {
        justifyContent: "flex-start",
        gap: "3",
      },
    },
  },
});

// Toggle button styles
const toggleButtonStyles = cva({
  base: {
    position: "absolute",
    top: "4",
    right: "-3",
    width: "6",
    height: "6",
    borderRadius: "full",
    backgroundColor: "page.background",
    borderWidth: "thin",
    borderColor: "border.default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    zIndex: 20,
    _hover: {
      backgroundColor: "border.subtle",
      borderColor: "border.strong",
    },
  },
});

// Types
export interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: string | number;
}

export interface SidebarProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
}

export interface SidebarGroupProps {
  title?: string;
  children: React.ReactNode;
}

// Sidebar Provider Component
export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

// Main Sidebar Component
export function Sidebar({
  children,
  className,
}: Omit<SidebarProps, "defaultCollapsed">) {
  const { isCollapsed, toggleCollapsed } = useSidebar();

  return (
    <Box
      className={`${sidebarStyles({ collapsed: isCollapsed })} ${className || ""}`}
    >
      {/* Toggle Button */}
      <button
        className={toggleButtonStyles()}
        onClick={toggleCollapsed}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        type="button"
      >
        <Icon icon={isCollapsed ? ChevronRight : ChevronLeft} size={16} />
      </button>

      {/* Sidebar Content */}
      <VStack gap="2" p="4" flex="1" alignItems="stretch">
        {children}
      </VStack>
    </Box>
  );
}

// Sidebar Header Component
export function SidebarHeader({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <Box
      mb="4"
      pb="4"
      borderBottomWidth="thin"
      borderBottomColor="border.default"
    >
      {isCollapsed ? (
        <Flex justifyContent="center">
          <Icon icon={Menu} size={24} />
        </Flex>
      ) : (
        children
      )}
    </Box>
  );
}

// Sidebar Group Component
export function SidebarGroup({ title, children }: SidebarGroupProps) {
  const { isCollapsed } = useSidebar();

  return (
    <VStack gap="1" alignItems="stretch">
      {title && !isCollapsed && (
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color="content.subtle"
          textTransform="uppercase"
          letterSpacing="wide"
          px="3"
          py="2"
        >
          {title}
        </Text>
      )}
      {children}
    </VStack>
  );
}

// Sidebar Item Component
export function SidebarItem({
  icon,
  label,
  href,
  onClick,
  active = false,
  badge,
}: SidebarItemProps) {
  const { isCollapsed } = useSidebar();

  const content = (
    <Box
      className={sidebarItemStyles({ active, collapsed: isCollapsed })}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <Icon icon={icon} size={20} />

      {!isCollapsed && (
        <>
          <Text
            fontSize="sm"
            fontWeight={active ? "semibold" : "medium"}
            color={active ? "brand.solid" : "content.primary"}
            flex="1"
          >
            {label}
          </Text>

          {badge && (
            <Box
              backgroundColor="brand.solid"
              color="brand.onSolid"
              borderRadius="full"
              px="2"
              py="0.5"
              fontSize="xs"
              fontWeight="semibold"
              minWidth="5"
              textAlign="center"
            >
              {badge}
            </Box>
          )}
        </>
      )}
    </Box>
  );

  if (href) {
    return (
      <Link href={href} css={{ textDecoration: "none" }}>
        {content}
      </Link>
    );
  }

  return content;
}

// Sidebar Footer Component
export function SidebarFooter({ children }: { children: React.ReactNode }) {
  return (
    <Box mt="auto" pt="4" borderTopWidth="thin" borderTopColor="border.default">
      {children}
    </Box>
  );
}

// Export hook and context type
export { useSidebar, type SidebarContextType };
