import { PricingPlanGroup } from "./PricingPlanSelector";

export default {
  title: "Design System/PricingPlanGroup",
  component: PricingPlanGroup,
};

export const Default = {
  args: {
    label: "Pricing Plan",
    description: "Choose the plan that best fits your needs.",
    errorMessage: "Please select a plan.",
  },
};

export const WithChildren = {
  args: {
    label: "Pricing Plan",
    description: "Choose the plan that best fits your needs.",
    errorMessage: "Please select a plan.",
  },
};
