"use client";

import type React from "react";
import {
  Breadcrumb as AriaBreadcrumb,
  type BreadcrumbProps as AriaBreadcrumbProps,
  Breadcrumbs as AriaBreadcrumbs,
} from "react-aria-components";
import { css } from "../../../styled-system/css";
import { Box, HStack } from "./Layout";

const breadCrumpStyle = css({
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: "1",
  fontSize: "sm",
});

const breadcrumbStyle = css({
  color: "gray.500",
  display: "flex",
  alignItems: "center",
  gap: "1",
});

function Breadcrumbs({
  children,
  ...props
}: React.ComponentProps<typeof AriaBreadcrumbs>) {
  return (
    <HStack gap="2" w="full">
      <AriaBreadcrumbs className={breadCrumpStyle} {...props}>
        {children}
      </AriaBreadcrumbs>
    </HStack>
  );
}

function BreadcrumbSeparator() {
  return <Box>{"/"}</Box>;
}

function Breadcrumb({ ...props }: AriaBreadcrumbProps) {
  return <AriaBreadcrumb className={breadcrumbStyle} {...props} />;
}

export { Breadcrumbs, Breadcrumb, BreadcrumbSeparator };
