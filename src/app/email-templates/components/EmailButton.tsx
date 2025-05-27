import { Button } from "@react-email/components";

const colors = {
  brand: {
    600: "#4f46e5",
    700: "#4338ca",
  },
  white: "#ffffff",
};

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export function EmailButton({
  href,
  children,
  variant = "primary",
}: EmailButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Button
      href={href}
      style={{
        backgroundColor: isPrimary ? colors.brand[600] : "transparent",
        color: isPrimary ? colors.white : colors.brand[600],
        border: isPrimary ? "none" : `2px solid ${colors.brand[600]}`,
        borderRadius: "8px",
        fontSize: "16px",
        fontWeight: "600",
        padding: "16px 32px",
        textDecoration: "none",
        display: "inline-block",
        textAlign: "center" as const,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {children}
    </Button>
  );
}
