// React Email Components

export { EmailButton } from "./components/EmailButton";
// Components for reuse
export { EmailLayout } from "./components/EmailLayout";
export { InvitationEmail } from "./InvitationEmail";

// Types
export type { InvitationEmailProps, VerificationEmailProps } from "./render";
// Render utilities
export {
  generateInvitationEmailHTML,
  generateInvitationEmailText,
  // Legacy compatibility exports
  generateVerificationEmailHTML,
  generateVerificationEmailText,
  renderInvitationEmailHTML,
  renderInvitationEmailText,
  renderVerificationEmailHTML,
  renderVerificationEmailText,
} from "./render";
export { VerificationEmail } from "./VerificationEmail";
