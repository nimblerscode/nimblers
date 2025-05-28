import { render } from "@react-email/render";
import { InvitationEmail, type InvitationEmailProps } from "./InvitationEmail";
import {
  VerificationEmail,
  type VerificationEmailProps,
} from "./VerificationEmail";

// Verification Email Renderers
export async function renderVerificationEmailHTML(
  props: VerificationEmailProps
): Promise<string> {
  return await render(VerificationEmail(props));
}

export async function renderVerificationEmailText(
  props: VerificationEmailProps
): Promise<string> {
  return await render(VerificationEmail(props), { plainText: true });
}

// Invitation Email Renderers
export async function renderInvitationEmailHTML(
  props: InvitationEmailProps
): Promise<string> {
  return await render(InvitationEmail(props));
}

export async function renderInvitationEmailText(
  props: InvitationEmailProps
): Promise<string> {
  return await render(InvitationEmail(props), { plainText: true });
}

// Legacy compatibility exports (for gradual migration)
export {
  renderVerificationEmailHTML as generateVerificationEmailHTML,
  renderVerificationEmailText as generateVerificationEmailText,
  renderInvitationEmailHTML as generateInvitationEmailHTML,
  renderInvitationEmailText as generateInvitationEmailText,
};

// Re-export types for convenience
export type { VerificationEmailProps, InvitationEmailProps };
