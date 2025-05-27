import {
  Column,
  Heading,
  Hr,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";

// Design tokens from your Panda config
const colors = {
  brand: {
    50: "#f0f4ff",
    100: "#e0e7ff",
    600: "#4f46e5",
  },
  gray: {
    50: "#f8fafc",
    200: "#e2e8f0",
    600: "#475569",
    700: "#334155",
    900: "#0f172a",
  },
  warning: {
    50: "#fef5e7",
    600: "#d97706",
    700: "#b45309",
  },
  white: "#ffffff",
};

export interface InvitationEmailProps {
  inviteeEmail: string;
  inviterName: string;
  organizationName: string;
  organizationSlug: string;
  role: string;
  invitationLink: string;
  expiresAt: Date;
}

export function InvitationEmail({
  inviteeEmail,
  inviterName,
  organizationName,
  organizationSlug,
  role,
  invitationLink,
  expiresAt,
}: InvitationEmailProps) {
  const formattedExpiresAt = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <EmailLayout title={`Join ${organizationName} on Nimblers`}>
      {/* Nimblers Brand Header */}
      <Section
        style={{
          backgroundColor: colors.white,
          padding: "24px 32px 16px 32px",
          textAlign: "center" as const,
          borderBottom: `1px solid ${colors.gray[200]}`,
        }}
      >
        <Heading
          style={{
            color: colors.brand[600],
            margin: "0",
            fontSize: "24px",
            fontWeight: "700",
            letterSpacing: "-0.5px",
          }}
        >
          Nimblers
        </Heading>
        <Text
          style={{
            color: colors.gray[600],
            margin: "4px 0 0 0",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          AI-Powered Conversational Commerce for Shopify
        </Text>
      </Section>

      {/* Header */}
      <Section
        style={{
          background: `linear-gradient(135deg, ${colors.brand[600]} 0%, ${colors.brand[600]}dd 100%)`,
          padding: "40px 32px",
          textAlign: "center" as const,
        }}
      >
        <Text
          style={{
            fontSize: "48px",
            margin: "0 0 16px 0",
          }}
        >
          🎉
        </Text>
        <Heading
          style={{
            color: colors.white,
            margin: "0",
            fontSize: "28px",
            fontWeight: "600",
            lineHeight: "1.2",
          }}
        >
          You're Invited to Join {organizationName}!
        </Heading>
        <Text
          style={{
            color: colors.white,
            margin: "10px 0 0 0",
            fontSize: "16px",
            opacity: 0.9,
          }}
        >
          Your team wants you to revolutionize e-commerce with AI
        </Text>
      </Section>

      {/* Content */}
      <Section style={{ padding: "40px 32px" }}>
        <Text
          style={{
            fontSize: "16px",
            color: colors.gray[700],
            margin: "0 0 24px 0",
            lineHeight: "1.6",
          }}
        >
          Hello,
        </Text>

        <Text
          style={{
            color: colors.gray[700],
            margin: "0 0 32px 0",
            lineHeight: "1.6",
            fontSize: "16px",
          }}
        >
          You've been invited to join <strong>{organizationName}</strong> on{" "}
          <strong>Nimblers</strong> as a <strong>{role}</strong>. You'll help
          transform how customers shop online using our cutting-edge AI-powered
          conversational storefront technology.
        </Text>

        {/* PROMINENT CTA SECTION - MOVED UP */}
        <Section
          style={{
            textAlign: "center" as const,
            margin: "32px 0 48px 0",
            padding: "32px 24px",
            backgroundColor: colors.brand[50],
            borderRadius: "12px",
            border: `2px solid ${colors.brand[600]}`,
          }}
        >
          <Text
            style={{
              color: colors.brand[600],
              fontSize: "18px",
              fontWeight: "600",
              margin: "0 0 8px 0",
              textTransform: "uppercase" as const,
              letterSpacing: "0.5px",
            }}
          >
            Ready to Transform E-commerce?
          </Text>

          <Text
            style={{
              color: colors.gray[600],
              fontSize: "14px",
              margin: "0 0 24px 0",
            }}
          >
            Join {organizationName} and start building the future of shopping
          </Text>

          {/* Enhanced CTA Button */}
          <Section style={{ margin: "0" }}>
            <a
              href={invitationLink}
              style={{
                backgroundColor: colors.brand[600],
                color: colors.white,
                padding: "18px 48px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "18px",
                display: "inline-block",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
                border: "none",
                cursor: "pointer",
                textAlign: "center" as const,
                lineHeight: "1.2",
                minWidth: "200px",
              }}
            >
              🚀 Join on Nimblers
            </a>
          </Section>

          <Text
            style={{
              color: colors.gray[600],
              fontSize: "14px",
              margin: "16px 0 0 0",
              fontStyle: "italic",
            }}
          >
            Start building AI-powered shopping experiences
          </Text>
        </Section>

        {/* Nimblers Value Proposition */}
        <Section
          style={{
            backgroundColor: colors.brand[50],
            borderRadius: "8px",
            padding: "24px",
            margin: "24px 0",
            border: `1px solid ${colors.brand[100]}`,
          }}
        >
          <Heading
            style={{
              margin: "0 0 12px 0",
              color: colors.brand[600],
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            🤖 What is Nimblers?
          </Heading>
          <Text
            style={{
              color: colors.gray[700],
              margin: "0 0 16px 0",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            Nimblers is the revolutionary AI-powered conversational storefront
            for Shopify that's transforming how customers shop online.
          </Text>
          <Text
            style={{
              color: colors.gray[700],
              margin: "0",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            <strong>🎯 Key Features:</strong>
            <br />• Personalized virtual shopping assistants via SMS, WhatsApp &
            MMS
            <br />• Hyper-personalized product recommendations using customer
            data
            <br />• Seamless integration with existing Shopify stores
            <br />• Proven to drive increased sales and customer engagement
          </Text>
        </Section>

        {/* Invitation Details */}
        <Section
          style={{
            backgroundColor: colors.gray[50],
            borderRadius: "8px",
            padding: "24px",
            margin: "24px 0",
            borderLeft: `4px solid ${colors.brand[600]}`,
          }}
        >
          <Heading
            style={{
              margin: "0 0 16px 0",
              color: colors.gray[900],
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            Invitation Details
          </Heading>

          <Row
            style={{
              marginBottom: "12px",
              paddingBottom: "8px",
              borderBottom: `1px solid ${colors.gray[200]}`,
            }}
          >
            <Column style={{ width: "40%" }}>
              <Text
                style={{
                  margin: "0",
                  fontWeight: "600",
                  color: colors.gray[700],
                  fontSize: "14px",
                }}
              >
                Platform:
              </Text>
            </Column>
            <Column style={{ width: "60%" }}>
              <Text
                style={{
                  margin: "0",
                  color: colors.brand[600],
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                Nimblers AI Commerce
              </Text>
            </Column>
          </Row>

          <Row
            style={{
              marginBottom: "12px",
              paddingBottom: "8px",
              borderBottom: `1px solid ${colors.gray[200]}`,
            }}
          >
            <Column style={{ width: "40%" }}>
              <Text
                style={{
                  margin: "0",
                  fontWeight: "600",
                  color: colors.gray[700],
                  fontSize: "14px",
                }}
              >
                Organization:
              </Text>
            </Column>
            <Column style={{ width: "60%" }}>
              <Text
                style={{
                  margin: "0",
                  color: colors.gray[900],
                  fontSize: "14px",
                }}
              >
                {organizationName}
              </Text>
            </Column>
          </Row>

          <Row
            style={{
              marginBottom: "12px",
              paddingBottom: "8px",
              borderBottom: `1px solid ${colors.gray[200]}`,
            }}
          >
            <Column style={{ width: "40%" }}>
              <Text
                style={{
                  margin: "0",
                  fontWeight: "600",
                  color: colors.gray[700],
                  fontSize: "14px",
                }}
              >
                Role:
              </Text>
            </Column>
            <Column style={{ width: "60%" }}>
              <Text
                style={{
                  margin: "0",
                  color: colors.gray[900],
                  fontSize: "14px",
                  textTransform: "capitalize" as const,
                }}
              >
                {role}
              </Text>
            </Column>
          </Row>

          <Row
            style={{
              marginBottom: "12px",
              paddingBottom: "8px",
              borderBottom: `1px solid ${colors.gray[200]}`,
            }}
          >
            <Column style={{ width: "40%" }}>
              <Text
                style={{
                  margin: "0",
                  fontWeight: "600",
                  color: colors.gray[700],
                  fontSize: "14px",
                }}
              >
                Invited by:
              </Text>
            </Column>
            <Column style={{ width: "60%" }}>
              <Text
                style={{
                  margin: "0",
                  color: colors.gray[900],
                  fontSize: "14px",
                }}
              >
                {organizationName} team
              </Text>
            </Column>
          </Row>

          <Row>
            <Column style={{ width: "40%" }}>
              <Text
                style={{
                  margin: "0",
                  fontWeight: "600",
                  color: colors.gray[700],
                  fontSize: "14px",
                }}
              >
                Expires:
              </Text>
            </Column>
            <Column style={{ width: "60%" }}>
              <Text
                style={{
                  margin: "0",
                  color: colors.gray[900],
                  fontSize: "14px",
                }}
              >
                {formattedExpiresAt}
              </Text>
            </Column>
          </Row>
        </Section>

        {/* Next Steps */}
        <Section style={{ margin: "40px 0" }}>
          <Heading
            style={{
              margin: "0 0 24px 0",
              color: colors.gray[900],
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            What happens next?
          </Heading>

          {/* Step 1 */}
          <Section style={{ marginBottom: "20px" }}>
            <Row style={{ verticalAlign: "top" }}>
              <Column style={{ width: "40px", paddingRight: "16px" }}>
                <div
                  style={{
                    backgroundColor: colors.brand[600],
                    color: colors.white,
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "table-cell",
                    fontSize: "14px",
                    fontWeight: "600",
                    textAlign: "center" as const,
                    lineHeight: "32px",
                  }}
                >
                  1
                </div>
              </Column>
              <Column style={{ verticalAlign: "top", paddingTop: "4px" }}>
                <Text
                  style={{
                    color: colors.gray[700],
                    lineHeight: "1.5",
                    margin: "0",
                    fontSize: "16px",
                    fontWeight: "500",
                  }}
                >
                  Click "Join on Nimblers" to accept your invitation
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Step 2 */}
          <Section style={{ marginBottom: "20px" }}>
            <Row style={{ verticalAlign: "top" }}>
              <Column style={{ width: "40px", paddingRight: "16px" }}>
                <div
                  style={{
                    backgroundColor: colors.brand[600],
                    color: colors.white,
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "table-cell",
                    fontSize: "14px",
                    fontWeight: "600",
                    textAlign: "center" as const,
                    lineHeight: "32px",
                  }}
                >
                  2
                </div>
              </Column>
              <Column style={{ verticalAlign: "top", paddingTop: "4px" }}>
                <Text
                  style={{
                    color: colors.gray[700],
                    lineHeight: "1.5",
                    margin: "0",
                    fontSize: "16px",
                    fontWeight: "500",
                  }}
                >
                  Set up your Nimblers account and explore the AI commerce
                  platform
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Step 3 */}
          <Section style={{ marginBottom: "0" }}>
            <Row style={{ verticalAlign: "top" }}>
              <Column style={{ width: "40px", paddingRight: "16px" }}>
                <div
                  style={{
                    backgroundColor: colors.brand[600],
                    color: colors.white,
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "table-cell",
                    fontSize: "14px",
                    fontWeight: "600",
                    textAlign: "center" as const,
                    lineHeight: "32px",
                  }}
                >
                  3
                </div>
              </Column>
              <Column style={{ verticalAlign: "top", paddingTop: "4px" }}>
                <Text
                  style={{
                    color: colors.gray[700],
                    lineHeight: "1.5",
                    margin: "0",
                    fontSize: "16px",
                    fontWeight: "500",
                  }}
                >
                  Start building conversational shopping experiences with{" "}
                  {organizationName}!
                </Text>
              </Column>
            </Row>
          </Section>
        </Section>

        {/* Warning Box */}
        <Section
          style={{
            backgroundColor: colors.warning[50],
            border: `1px solid ${colors.warning[600]}`,
            borderRadius: "6px",
            padding: "16px",
            margin: "24px 0",
          }}
        >
          <Text
            style={{
              color: colors.warning[700],
              fontSize: "14px",
              margin: "0",
              lineHeight: "1.5",
            }}
          >
            ⚠️ <strong>Important:</strong> This invitation will expire on{" "}
            {formattedExpiresAt}. Please accept it before then to join{" "}
            {organizationName} and start building the future of e-commerce.
          </Text>
        </Section>

        <Hr style={{ margin: "32px 0", borderColor: colors.gray[200] }} />

        {/* Alternative Link */}
        <Text
          style={{
            color: colors.gray[600],
            fontSize: "14px",
            margin: "0",
            lineHeight: "1.5",
          }}
        >
          If the button above doesn't work, you can copy and paste this link
          into your browser:
          <br />
          <a
            href={invitationLink}
            style={{
              color: colors.brand[600],
              wordBreak: "break-all" as const,
              textDecoration: "underline",
            }}
          >
            {invitationLink}
          </a>
        </Text>

        <Hr style={{ margin: "32px 0", borderColor: colors.gray[200] }} />

        {/* Footer with Nimblers Branding */}
        <Section
          style={{
            textAlign: "center" as const,
            padding: "24px 0",
            backgroundColor: colors.gray[50],
            borderRadius: "8px",
            margin: "24px 0",
          }}
        >
          <Heading
            style={{
              color: colors.brand[600],
              margin: "0 0 8px 0",
              fontSize: "20px",
              fontWeight: "700",
              letterSpacing: "-0.5px",
            }}
          >
            Nimblers
          </Heading>
          <Text
            style={{
              color: colors.gray[600],
              fontSize: "14px",
              margin: "0 0 16px 0",
              fontWeight: "500",
            }}
          >
            AI-Powered Conversational Commerce for Shopify
          </Text>
          <Text
            style={{
              color: colors.gray[600],
              fontSize: "12px",
              margin: "0",
              lineHeight: "1.5",
            }}
          >
            This invitation was sent to <strong>{inviteeEmail}</strong> via
            Nimblers.
            <br />
            If you weren't expecting this invitation, you can safely ignore this
            email.
          </Text>
        </Section>
      </Section>
    </EmailLayout>
  );
}
