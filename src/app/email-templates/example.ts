import {
  renderInvitationEmailHTML,
  renderInvitationEmailText,
  renderVerificationEmailHTML,
  renderVerificationEmailText,
} from "./render";

// Example usage of the new React Email templates

export async function exampleVerificationEmail() {
  const props = {
    userEmail: "user@example.com",
    userName: "John Doe",
    verificationLink: "https://nimblers.co/verify?token=abc123",
  };

  const html = await renderVerificationEmailHTML(props);
  const text = await renderVerificationEmailText(props);

  return { html, text };
}

export async function exampleInvitationEmail() {
  const props = {
    inviteeEmail: "newuser@example.com",
    inviterName: "Jane Smith",
    organizationName: "Acme Corp",
    organizationSlug: "acme-corp",
    role: "member",
    invitationLink: "https://nimblers.co/invite?token=xyz789",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  };

  const html = await renderInvitationEmailHTML(props);
  const text = await renderInvitationEmailText(props);

  return { html, text };
}

// Migration guide:
//
// OLD WAY (using the .ts files):
// import { generateVerificationEmailHTML } from "./verification-email";
// const html = generateVerificationEmailHTML(props);
//
// NEW WAY (using React Email):
// import { renderVerificationEmailHTML } from "./render";
// const html = await renderVerificationEmailHTML(props);
//
// The new templates provide:
// ✅ Better design consistency with your Panda CSS design system
// ✅ Professional email client compatibility
// ✅ Responsive design
// ✅ Type safety with TypeScript
// ✅ Reusable components
// ✅ Better maintainability
