import { CheckIcon } from "lucide-react";
import type React from "react";
import { createContext, useContext } from "react";
import {
  type RadioGroupProps as AriaRadioGroupProps,
  type RadioProps as AriaRadioProps,
  FieldError,
  Radio,
  RadioGroup,
  type RadioRenderProps,
} from "react-aria-components";
import { css } from "../../../styled-system/css";
import { Box, HStack, VStack } from "../../../styled-system/jsx";
import { Button } from "./Button";
import { Heading } from "./Heading";
import { Icon } from "./Icon";
import { Label } from "./Input";
import { ListItem } from "./ListItem";
import { Pill } from "./Pill";
import { Text } from "./Text";

// --- Context for selected state ---
const PlanSelectedContext = createContext(false);
export const usePlanSelected = () => useContext(PlanSelectedContext);

// --- PricingPlanGroup ---
export interface PricingPlanGroupProps
  extends Omit<AriaRadioGroupProps, "children"> {
  children: React.ReactNode;
  label?: string;
  description?: string;
  errorMessage?: string;
}

const labelStyles = css({
  fontSize: "xl",
  fontWeight: "semibold",
  color: "content.primary",
});

const descriptionStyles = css({
  color: "content.secondary",
  fontSize: "sm",
});

const errorStyles = css({
  color: "status.danger.text",
  fontSize: "sm",
});

export const PricingPlanGroup = ({
  children,
  className,
  label,
  description,
  errorMessage,
  ...props
}: PricingPlanGroupProps) => {
  return (
    <VStack gap="4" w="full" alignItems="stretch">
      <RadioGroup {...props} className={className}>
        {label && <Label className={labelStyles}>{label}</Label>}
        <VStack gap="4" w="full" alignItems="stretch">
          {children}
          {description && (
            <Text slot="description" className={descriptionStyles}>
              {description}
            </Text>
          )}
          {errorMessage && (
            <FieldError className={errorStyles}>{errorMessage}</FieldError>
          )}
        </VStack>
      </RadioGroup>
    </VStack>
  );
};

// --- PricingPlanCard ---
export interface PricingPlanCardProps
  extends Omit<AriaRadioProps, "className"> {
  value: string;
  className?: string;
}

export const PricingPlanCard = ({
  children,
  className,
  value,
  ...props
}: PricingPlanCardProps) => {
  const radioStyles = css({
    display: "flex",
    flexDirection: "column",
    borderWidth: "1px",
    borderRadius: "sm",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",

    /* base */
    borderColor: "border.default",
    position: "relative",

    /* hover */
    "&:not([data-selected]):hover": {
      borderColor: "border.strong",
    },
    /* focus */
    _focusVisible: {
      borderColor: "brand.solid",
      outline: "none",
      ringColor: "border.focus",
      ring: "solid",
      ringWidth: "2",
      ringOffset: "0.5",
    },

    /* selected */
    _selected: {
      borderColor: "brand.solid",
    },
  });

  const finalClassName = `${radioStyles} ${className || ""}`.trim();

  return (
    <Radio {...props} value={value} className={finalClassName}>
      {(renderProps: RadioRenderProps) => (
        <PlanSelectedContext.Provider value={renderProps.isSelected}>
          {typeof children === "function"
            ? (children as (values: RadioRenderProps) => React.ReactNode)(
                renderProps,
              )
            : children}
        </PlanSelectedContext.Provider>
      )}
    </Radio>
  );
};

// --- PlanSelectedIndicator ---
const indicatorContainerStyles = css({
  width: "5",
  height: "5",
  borderRadius: "full",
  borderWidth: "2px",
  borderColor: "border.subtle",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease-in-out",
  flexShrink: 0,

  /* selected */
  "[data-selected] &": {
    borderColor: "brand.solid",
    bg: "brand.solid",
  },
});

const indicatorIconStyles = css({
  opacity: 0,
  transition: "opacity 0.2s ease-in-out",
  color: "brand.onSolid",
  width: "3",
  height: "3",

  "[data-selected] &": { opacity: 1 },
});

const PlanSelectedIndicator = () => {
  return (
    <Box className={indicatorContainerStyles}>
      <Icon icon={CheckIcon} className={indicatorIconStyles} />
    </Box>
  );
};

// --- PricingPlanCard.Header ---
export interface PricingPlanCardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  planName: string;
  description: string;
  price: string;
  isRecommended?: boolean;
}

const priceStyles = css({
  fontSize: "xl",
  fontWeight: "semibold",
  color: "content.primary",
  display: "flex",
  alignItems: "baseline",
  gap: "1",

  "[data-selected] &": { color: "content.primary" },
});

const pricePerMonthStyles = css({
  fontSize: "sm",
  fontWeight: "normal",
  color: "content.secondary",
});

const headerTextStyles = css({
  borderTopRadius: "sm",
  padding: "4",

  "[data-selected] &": {
    bg: "brand.subtleBg",
    color: "content.primary",
  },
});

export const PricingPlanCardHeader = ({
  planName,
  description,
  price,
  isRecommended,
  ...props
}: PricingPlanCardHeaderProps) => {
  return (
    <HStack
      className={headerTextStyles}
      gap="3"
      alignItems="flex-start"
      w="full"
      {...props}
    >
      <PlanSelectedIndicator />
      <VStack alignItems="flex-start" gap="1" flexGrow={1}>
        <HStack gap="1" alignItems="center">
          <Heading as="h3" levelStyle="h3" color="content.primary" m="0">
            {planName}
          </Heading>
          {isRecommended && (
            <Pill variant="success" size="md">
              Recommended
            </Pill>
          )}
        </HStack>
        <Text slot="description" color="content.secondary" fontSize="sm">
          {description}
        </Text>
      </VStack>
      <Box className={priceStyles}>
        {price === "Free" ? (
          price
        ) : (
          <>
            {price}
            <Text slot="description" className={pricePerMonthStyles}>
              /month
            </Text>
          </>
        )}
      </Box>
    </HStack>
  );
};

// --- PricingPlanCard.Body ---
export interface PricingPlanCardBodyProps
  extends React.HTMLAttributes<HTMLDivElement> {
  features?: string[];
}

const featureListStyles = css({
  alignItems: "flex-start",
  gap: "2",
  padding: "4",
});

const featureItemStyles = css({
  // color: 'brand.onSolid',
  fontSize: "sm",
});

const featureIconStyles = css({
  color: "status.success.icon",
  width: "4",
  height: "4",
});

export const PricingPlanCardBody = ({
  features,
  ...props
}: PricingPlanCardBodyProps) => {
  const isParentSelected = usePlanSelected();
  if (!features || features.length === 0) return null;

  return isParentSelected ? (
    <VStack gap="2" className={featureListStyles} {...props}>
      <Text slot="description" fontWeight="medium" color="content.primary">
        Includes:
      </Text>
      {features.map((feature) => (
        <ListItem
          key={feature}
          icon={<Icon icon={CheckIcon} className={featureIconStyles} />}
          iconGap="2"
          className={featureItemStyles}
        >
          {feature}
        </ListItem>
      ))}
    </VStack>
  ) : null;
};

// --- PricingPlanCard.Footer ---
export interface PricingPlanCardFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {
  ctaText?: string;
  onCtaClick?: () => void;
}

const footerStyles = css({
  width: "full",
});

export const PricingPlanCardFooter: React.FC<PricingPlanCardFooterProps> = ({
  ctaText = "Continue",
  onCtaClick,
  ...props
}) => {
  const isParentSelected = usePlanSelected();
  if (!isParentSelected) return null;

  return (
    <Box className={footerStyles} {...props} p="4">
      <Button variant="primary" size="lg" onPress={onCtaClick}>
        {ctaText}
      </Button>
    </Box>
  );
};
