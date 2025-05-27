# Email Templates

Professional email templates built with [React Email](https://react.email/docs) that match your Panda CSS design system.

## Features

✅ **Design System Integration** - Uses your exact brand colors and typography from `panda.config.ts`  
✅ **Professional Appearance** - Clean, modern design that works across all email clients  
✅ **Responsive Design** - Looks great on desktop and mobile  
✅ **Type Safety** - Full TypeScript support with proper interfaces  
✅ **Reusable Components** - Modular components for consistency  
✅ **Email Client Compatibility** - Tested with Gmail, Outlook, Apple Mail, and more

## Available Templates

### 1. Verification Email

Professional email verification template with security messaging.

```tsx
import { renderVerificationEmailHTML } from "@/app/email-templates";

const html = await renderVerificationEmailHTML({
  userEmail: "user@example.com",
  userName: "John Doe", // optional
  verificationLink: "https://yourapp.com/verify?token=abc123",
});
```

### 2. Invitation Email

Organization invitation template with detailed steps and expiration warnings.

```tsx
import { renderInvitationEmailHTML } from "@/app/email-templates";

const html = await renderInvitationEmailHTML({
  inviteeEmail: "newuser@example.com",
  inviterName: "Jane Smith",
  organizationName: "Acme Corp",
  organizationSlug: "acme-corp",
  role: "member",
  invitationLink: "https://yourapp.com/invite?token=xyz789",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});
```

## Usage

### Basic Usage

```tsx
import {
  renderVerificationEmailHTML,
  renderVerificationEmailText,
} from "@/app/email-templates";

// Generate HTML version
const htmlContent = await renderVerificationEmailHTML(props);

// Generate plain text version
const textContent = await renderVerificationEmailText(props);

// Send with your email service
await emailService.send({
  to: props.userEmail,
  subject: "Verify Your Email",
  html: htmlContent,
  text: textContent,
});
```

### With Resend (recommended)

```tsx
import { Resend } from "resend";
import { renderVerificationEmailHTML } from "@/app/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "noreply@yourapp.com",
  to: userEmail,
  subject: "Verify Your Email Address",
  html: await renderVerificationEmailHTML(props),
});
```

## Design System Integration

The templates automatically use your design tokens from `panda.config.ts`:

- **Brand Colors**: `#4f46e5` (brand.600) for primary actions
- **Typography**: Inter font family matching your app
- **Spacing**: Consistent padding and margins
- **Status Colors**: Success, warning, and info colors
- **Gray Scale**: Proper contrast ratios for accessibility

## Components

### EmailLayout

Base layout component with consistent styling and footer.

### EmailButton

Branded button component with primary/secondary variants.

```tsx
<EmailButton href="https://example.com" variant="primary">
  Click Here
</EmailButton>
```

## Migration from Legacy Templates

### Before (legacy .ts files)

```tsx
import { generateVerificationEmailHTML } from "./verification-email";
const html = generateVerificationEmailHTML(props); // synchronous
```

### After (React Email)

```tsx
import { renderVerificationEmailHTML } from "@/app/email-templates";
const html = await renderVerificationEmailHTML(props); // async
```

## Development

### Preview Templates

Use React Email's preview feature during development:

```bash
npx react-email dev
```

### Testing

The templates are tested across major email clients:

- Gmail (Web, iOS, Android)
- Outlook (Web, Desktop, Mobile)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- Thunderbird

## Best Practices

1. **Always provide both HTML and text versions** for better deliverability
2. **Test in multiple email clients** before deploying
3. **Keep subject lines under 50 characters** for mobile compatibility
4. **Use descriptive alt text** for any images
5. **Include unsubscribe links** for marketing emails

## Customization

To add new email templates:

1. Create a new component in the templates folder
2. Use the `EmailLayout` wrapper for consistency
3. Extract colors from the design tokens object
4. Add render functions to `render.ts`
5. Export from `index.ts`

Example:

```tsx
// NewTemplate.tsx
import { EmailLayout } from "./components/EmailLayout";

export function NewTemplate(props: NewTemplateProps) {
  return <EmailLayout title="New Template">{/* Your content */}</EmailLayout>;
}
```
