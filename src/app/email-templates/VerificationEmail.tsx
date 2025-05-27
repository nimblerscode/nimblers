import { Heading, Hr, Section, Text } from "@react-email/components";
import { EmailButton } from "./components/EmailButton";
import { EmailLayout } from "./components/EmailLayout";

// Design tokens from your Panda config
const colors = {
  brand: {
    50: "#f0f4ff",
    600: "#4f46e5",
  },
  gray: {
    200: "#e2e8f0",
    600: "#475569",
    700: "#334155",
    900: "#0f172a",
  },
  success: "#059669",
  white: "#ffffff",
};

export interface VerificationEmailProps {
  userEmail: string;
  userName?: string;
  verificationLink: string;
}

export function VerificationEmail({
  userEmail,
  userName,
  verificationLink,
}: VerificationEmailProps) {
  const displayName = userName || userEmail.split("@")[0];

  return (
    <EmailLayout title="Verify Your Email Address">
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
          ✉️
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
          Verify Your Email
        </Heading>
      </Section>

      {/* Content */}
      <Section style={{ padding: "40px 32px" }}>
        <Text
          style={{
            fontSize: "18px",
            color: colors.gray[900],
            margin: "0 0 24px 0",
            fontWeight: "500",
          }}
        >
          Hello {displayName}! 👋
        </Text>

        <Text
          style={{
            color: colors.gray[700],
            margin: "0 0 24px 0",
            lineHeight: "1.6",
            fontSize: "16px",
          }}
        >
          Welcome to <strong>Nimblers</strong>! To complete your account setup
          and ensure the security of your account, please verify your email
          address by clicking the button below.
        </Text>

        <Text
          style={{
            color: colors.gray[700],
            margin: "0 0 32px 0",
            lineHeight: "1.6",
            fontSize: "16px",
          }}
        >
          This verification helps us:
        </Text>

        <Section style={{ marginLeft: "20px", marginBottom: "32px" }}>
          <Text
            style={{
              color: colors.gray[700],
              margin: "0 0 8px 0",
              fontSize: "16px",
            }}
          >
            • Confirm that you own this email address
          </Text>
          <Text
            style={{
              color: colors.gray[700],
              margin: "0 0 8px 0",
              fontSize: "16px",
            }}
          >
            • Send you important account notifications
          </Text>
          <Text
            style={{
              color: colors.gray[700],
              margin: "0 0 0 0",
              fontSize: "16px",
            }}
          >
            • Keep your account secure
          </Text>
        </Section>

        {/* CTA Button */}
        <Section style={{ textAlign: "center" as const, margin: "32px 0" }}>
          <EmailButton href={verificationLink}>
            Verify Email Address
          </EmailButton>
        </Section>

        {/* Security Note */}
        <Section
          style={{
            backgroundColor: colors.brand[50],
            borderLeft: `4px solid ${colors.brand[600]}`,
            padding: "16px",
            margin: "24px 0",
            borderRadius: "4px",
          }}
        >
          <Text
            style={{
              color: colors.gray[700],
              margin: "0",
              fontSize: "14px",
              lineHeight: "1.5",
            }}
          >
            🔒 <strong>Security Note:</strong> This verification link is unique
            to your account and will expire in 1 hour for security reasons.
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
            href={verificationLink}
            style={{
              color: colors.brand[600],
              wordBreak: "break-all" as const,
              textDecoration: "underline",
            }}
          >
            {verificationLink}
          </a>
        </Text>

        <Hr style={{ margin: "32px 0", borderColor: colors.gray[200] }} />

        <Text
          style={{
            color: colors.gray[600],
            fontSize: "14px",
            margin: "0",
            lineHeight: "1.5",
            textAlign: "center" as const,
          }}
        >
          This verification email was sent to <strong>{userEmail}</strong>.
          <br />
          If you didn't create an account with us, you can safely ignore this
          email.
        </Text>
      </Section>
    </EmailLayout>
  );
}
