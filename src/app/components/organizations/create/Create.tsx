"use client";
import { Building2, Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import {
  type CreateOrganizationActionState,
  createOrganizationAction,
} from "@/app/actions/organization/create";
import {
  Banner,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
  Heading,
  HStack,
  Icon,
  Label,
  Text,
  TextField,
  VStack,
} from "@/app/design-system";
import {
  PricingPlanCard,
  PricingPlanCardBody,
  PricingPlanCardHeader,
  PricingPlanGroup,
} from "@/app/design-system/PricingPlanSelector";
import { PlanDurationSelector } from "./PlanDurationSelector";

const PRICING_PLANS = [
  {
    id: "free",
    name: "Free",
    description: "For individuals and small teams just getting started",
    price: "$0",
    features: [
      "1000 messages per month",
      "Basic analytics",
      "Basic support",
      "Basic permissions",
      "Basic branding",
    ],
    isRecommended: false,
  },
  {
    id: "basic",
    name: "Basic",
    description: "For growing teams with more messaging needs",
    price: "$10",
    features: [
      "1000 messages per month",
      "Advanced analytics",
      "Priority support",
      "Customizable branding",
      "Advanced permissions",
      "Team collaboration",
      "24/7 support",
    ],
    isRecommended: true,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For large teams with high messaging needs",
    price: "$20",
    features: [
      "Unlimited messages",
      "Advanced analytics",
      "Priority support",
      "Customizable branding",
      "Advanced permissions",
      "Team collaboration",
      "24/7 support",
    ],
    isRecommended: false,
  },
];

const initialState: CreateOrganizationActionState = {
  success: false,
  message: "",
  errors: null,
  organization: null,
};

export function CreateOrganization() {
  const [organizationName, setOrganizationName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(PRICING_PLANS[1]);
  const [state, formAction, pending] = useActionState(
    createOrganizationAction,
    initialState,
  );

  if (state.success) {
    window.location.href = `/organization/${state.organization?.slug}`;
  }

  return (
    <Card w="full">
      <VStack gap="6" w="full" alignItems="stretch">
        <CardHeader>
          <HStack gap="3">
            <Flex
              w="10"
              alignItems="center"
              justifyContent="center"
              h="10"
              borderRadius="full"
              bg="status.success.subtleBg"
              p="2"
            >
              <Icon icon={Building2} color="colors.status.success.icon" />
            </Flex>
            <VStack alignItems="flex-start" gap="1">
              <CardTitle>Create your organization</CardTitle>
              <Heading as="h3" levelStyle="h5" color="page.textSecondary">
                Set up your Nimblers workspace for your team
              </Heading>
            </VStack>
          </HStack>
        </CardHeader>
        <CardContent w="full">
          <form action={formAction}>
            <VStack gap="6" w="full" alignItems="stretch">
              {!state.success && state.message ? (
                <Banner variant="danger" title="Organization creation failed">
                  <Text
                    fontSize="sm"
                    color="content.danger"
                    maxWidth="100%"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {state.message}
                  </Text>
                </Banner>
              ) : null}
              <VStack gap="2" w="full" alignItems="stretch">
                <TextField
                  isRequired
                  name="name"
                  label="Organization name"
                  inputProps={{ placeholder: "Nimblers Inc" }}
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e)}
                />
                {organizationName ? (
                  <Text fontSize="sm" color="content.secondary">
                    Your organization URL will be:{" "}
                    <Text as="span" fontWeight="bold">
                      nimblers.com/
                      {organizationName.toLowerCase().replace(/ /g, "-")}
                    </Text>
                  </Text>
                ) : null}
              </VStack>
              <HStack
                gap="6"
                w="full"
                alignItems="center"
                justifyContent="space-between"
              >
                <Label>Select a plan</Label>
                <PlanDurationSelector
                  orientation="vertical"
                  name="planDuration"
                />
              </HStack>
              <VStack gap="6">
                <PricingPlanGroup
                  defaultValue={selectedPlan.id}
                  onChange={(value) =>
                    setSelectedPlan(
                      PRICING_PLANS.find((plan) => plan.id === value) ||
                        PRICING_PLANS[0],
                    )
                  }
                >
                  {PRICING_PLANS.map((plan) => (
                    <PricingPlanCard key={plan.id} value={plan.id}>
                      <PricingPlanCardHeader
                        planName={plan.name}
                        description={plan.description}
                        price={plan.price}
                        isRecommended={plan.isRecommended}
                      />
                      <PricingPlanCardBody features={plan.features} />
                      {/* <PricingPlanCardFooter /> */}
                    </PricingPlanCard>
                  ))}
                </PricingPlanGroup>
                <Button variant="primary" size="lg" type="submit">
                  <HStack gap="2">
                    {selectedPlan.id === "free"
                      ? "Create organization"
                      : "Continue to Payment"}
                    {pending ? (
                      <Box animation="spin">
                        <Icon icon={Loader2} />
                      </Box>
                    ) : null}
                  </HStack>
                </Button>
              </VStack>
            </VStack>
          </form>
        </CardContent>
      </VStack>
    </Card>
  );
}
