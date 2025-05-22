"use client";

import {
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
} from "react-aria-components";
import { styled } from "../../../styled-system/jsx";
import type {
  HTMLStyledProps,
  SystemStyleObject,
} from "../../../styled-system/types";

// Props interfaces
export interface TabsProps extends HTMLStyledProps<"div"> {
  /**
   * The orientation of the tabs
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Custom CSS styles
   */
  css?: SystemStyleObject;
}

export interface TabListProps extends HTMLStyledProps<"div"> {
  /**
   * Accessible label for the tab list
   */
  "aria-label": string;
  /**
   * Custom CSS styles
   */
  css?: SystemStyleObject;
}

export interface TabProps extends HTMLStyledProps<"button"> {
  /**
   * The unique identifier for the tab
   */
  id: string;
  /**
   * Whether the tab is disabled
   */
  isDisabled?: boolean;
  /**
   * Custom CSS styles
   */
  css?: SystemStyleObject;
}

export interface TabPanelProps extends HTMLStyledProps<"div"> {
  /**
   * The unique identifier for the panel, matching the tab's id
   */
  id: string;
  /**
   * Custom CSS styles
   */
  css?: SystemStyleObject;
}

const StyledTabs = styled(AriaTabs, {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6",
    width: "full",
  },
  variants: {
    orientation: {
      horizontal: {},
      vertical: {
        flexDirection: "row",
        alignItems: "flex-start",
      },
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

const StyledTabList = styled(AriaTabList, {
  base: {
    display: "flex",
    gap: "1",
    borderBottom: "1px solid",
    borderColor: "border.default",
    '&[data-orientation="vertical"]': {
      flexDirection: "column",
      borderBottom: "none",
      borderRight: "1px solid",
      borderColor: "border.default",
    },
  },
});

const StyledTab = styled(AriaTab, {
  base: {
    px: "4",
    py: "2",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    fontSize: "sm",
    fontWeight: "500",
    color: "text.subtle",
    _hover: {
      color: "text.default",
    },
    "&[data-selected]": {
      color: "brand.solid",
      borderColor: "brand.solid",
    },
    "&:hover:not([data-selected])": {
      borderBottomColor: "border.default",
      borderBottomWidth: "2px",
    },
    "&[data-disabled]": {
      cursor: "not-allowed",
      color: "text.disabled",
      _hover: {
        color: "text.disabled",
      },
    },
    '&[data-orientation="vertical"]': {
      borderBottom: "none",
      borderRight: "2px solid transparent",
      "&[data-selected]": {
        borderColor: "accent.default",
      },
    },
  },
});

const StyledTabPanel = styled(AriaTabPanel, {
  base: {},
});

export const TTabs = {
  Root: StyledTabs,
  List: StyledTabList,
  Tab: StyledTab,
  Panel: StyledTabPanel,
};
