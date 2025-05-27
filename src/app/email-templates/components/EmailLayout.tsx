import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

// Design tokens from your Panda config
const colors = {
  // Brand colors
  brand: {
    50: "#f0f4ff",
    100: "#e0e7ff",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
  },
  // Gray scale
  gray: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    600: "#475569",
    700: "#334155",
    900: "#0f172a",
  },
  // Status colors
  success: "#059669",
  white: "#ffffff",
};

const fonts = {
  sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

interface EmailLayoutProps {
  children: ReactNode;
  title: string;
}

export function EmailLayout({ children, title }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head>
        <title>{title}</title>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{
            url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Body
        style={{
          backgroundColor: colors.gray[50],
          fontFamily: fonts.sans,
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: colors.white,
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          {children}
        </Container>

        {/* Footer */}
        <Section
          style={{
            backgroundColor: colors.gray[50],
            padding: "24px 32px",
            textAlign: "center" as const,
          }}
        >
          <Text
            style={{
              color: colors.gray[600],
              fontSize: "14px",
              margin: "0",
              lineHeight: "1.5",
            }}
          >
            © 2025 Nimblers. All rights reserved.
          </Text>
        </Section>
      </Body>
    </Html>
  );
}
