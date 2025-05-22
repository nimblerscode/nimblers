"use client";
import {
  type RadioGroupProps as AriaRadioGroupProps,
  Label,
  Radio,
  RadioGroup,
} from "react-aria-components";
import { Flex, HStack, Pill } from "@/app/design-system";
import { cva } from "../../../../../styled-system/css";

// Styled container for the radio group - COMMENTED OUT FOR NOW
// const StyledRadioGroupContainer = styled(RadioGroup, {
//   base: {
//     display: 'flex',
//     padding: '1',
//     borderRadius: 'md',
//     borderWidth: '1px',
//     borderColor: 'border.subtle', // Using a subtle border
//     backgroundColor: 'surface.secondary', // Light background for the container
//   },
// });

// CVA for individual radio items styling
const radioItemStyles = cva({
  base: {
    paddingX: "3",
    paddingY: "1.5",
    borderRadius: "sm",
    cursor: "pointer",
    fontWeight: "medium",
    fontSize: "sm",
    transition: "all 0.2s ease-in-out",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    borderWidth: "1px",
    ring: "1px",
    ringColor: "content.primary",
    ringOffset: "1px",
    borderColor: "transparent", // Transparent border by default
    color: "content.secondary",
    backgroundColor: "transparent",
    position: "relative", // Added for focus ring positioning
    "&_hover:not([data-selected])": {
      color: "brand.solidHover",
      backgroundColor: "brand.solidHover",
    },
    _selected: {
      backgroundColor: "brand.solid",
      color: "brand.onSolid",
      borderColor: "brand.solid",
      boxShadow: "sm",
    },
    _focusVisible: {
      ringColor: "focusRing.default",
      ring: "solid",
      ringWidth: "2",
      ringOffset: "0.5",
    },
    _disabled: {
      color: "disabled.foreground",
      backgroundColor: "disabled.background",
      cursor: "not-allowed",
      _hover: {
        backgroundColor: "disabled.background",
      },
    },
  },
});

interface PlanDurationSelectorProps
  extends Omit<AriaRadioGroupProps, "className" | "style"> {
  className?: string;
  // Options are fixed for now (Monthly, Yearly)
  // Could be extended with an items prop if more flexibility is needed.
}

export const PlanDurationSelector = ({
  className,
  ...otherProps
}: PlanDurationSelectorProps) => {
  return (
    // Using raw RadioGroup directly
    <Flex
      borderColor="border.subtle"
      borderWidth="1px"
      borderRadius="sm"
      padding="1"
    >
      <RadioGroup {...otherProps} defaultValue="monthly">
        <Label
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            margin: "-1px",
            padding: "0",
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            border: "0",
          }}
        >
          Select plan duration
        </Label>
        <HStack w="full" className={className} alignItems="stretch" gap="0">
          <Radio value="monthly" className={radioItemStyles()}>
            Monthly
          </Radio>
          <Radio value="yearly" className={radioItemStyles()}>
            <HStack gap="1" alignItems="center">
              Yearly
              <Pill variant="success" size="md">
                -20%
              </Pill>
            </HStack>
          </Radio>
        </HStack>
      </RadioGroup>
    </Flex>
  );
};

PlanDurationSelector.displayName = "PlanDurationSelector";

// Removed PlanDurationRadioProps and PlanDurationRadio export
