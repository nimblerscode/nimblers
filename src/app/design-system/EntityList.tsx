import type React from "react";
import type { ReactNode } from "react";
import { css, cx } from "../../../styled-system/css";
import { styled } from "../../../styled-system/jsx";
import { Avatar, type AvatarProps } from "./Avatar";
import { Heading } from "./Heading";
import { Box, HStack, VStack } from "./Layout";
import { Text } from "./Text";

// --- EntityList Root Component ---
interface EntityListProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
}

const EntityListRoot = ({
  title,
  children,
  className,
  ...props
}: EntityListProps) => {
  return (
    <VStack
      p={{ base: "4", md: "2", sm: "0" }}
      className={className}
      alignItems="stretch"
      {...props}
    >
      <Box
        backgroundColor="brand.foreground" // Uses semantic token: surface.raised (default) or theme-specific
        borderWidth="1px"
        borderColor="border.default" // Uses semantic token: border.default (default) or theme-specific
        borderRadius="sm"
      >
        {title && (
          <Heading
            as="h3"
            color="content.primary"
            p={{ base: "4", md: "4", sm: "0" }}
            borderBottom="1px solid token(colors.border.default)"
          >
            {title}
          </Heading>
        )}
        <VStack alignItems="stretch" gap="0">
          {children}
        </VStack>
      </Box>
    </VStack>
  );
};

// --- EntityListItem Component ---
interface EntityListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  avatarProps?: AvatarProps;
  title: string;
  subtitle?: string;
  extraInfo?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

const EntityListItem: React.FC<EntityListItemProps> = ({
  avatarProps,
  title,
  subtitle,
  extraInfo,
  actions,
  children,
  className,
  ...props
}) => {
  const defaultAvatarName = title || "User";

  const itemStyles = css({
    p: { base: "4", md: "4", sm: "2" },
    borderBottom: "1px solid token(colors.border.default)",
    _last: {
      borderBottom: "none",
    },
    _hover: {
      bg: "gray.50",
    },
    display: "flex",
    flexDirection: { base: "column", md: "row" },
    alignItems: "center",
    justifyContent: "space-between",
  });

  return (
    <styled.li className={cx(itemStyles, className)} {...props}>
      <HStack alignItems="center" flexGrow={1}>
        {avatarProps && <Avatar name={defaultAvatarName} {...avatarProps} />}
        <VStack alignItems="flex-start" flexGrow={1} gap="0">
          <Heading as="h4" levelStyle="h5">
            {title}
          </Heading>
          {subtitle && (
            <Text color="content.secondary" fontSize="sm">
              {subtitle}
            </Text>
          )}
        </VStack>
      </HStack>

      <HStack alignItems="center" gap="2" flexShrink={0}>
        {extraInfo && (
          <Text color="content.subtle" fontSize="12px" whiteSpace="nowrap">
            {extraInfo}
          </Text>
        )}
        {actions}
      </HStack>
      {children}
    </styled.li>
  );
};

// --- Compound Component Assignment ---
export const EntityList = Object.assign(EntityListRoot, {
  Item: EntityListItem,
});

