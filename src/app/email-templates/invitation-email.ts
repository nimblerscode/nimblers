export interface InvitationEmailProps {
  inviteeEmail: string;
  inviterName: string;
  organizationName: string;
  organizationSlug: string;
  role: string;
  invitationLink: string;
  expiresAt: Date;
}

export function generateInvitationEmailHTML({
  inviteeEmail,
  inviterName,
  organizationName,
  organizationSlug,
  role,
  invitationLink,
  expiresAt,
}: InvitationEmailProps): string {
  const formattedExpiresAt = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're invited to join ${organizationName}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .invitation-details {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #667eea;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
            margin-bottom: 0;
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #4a5568;
        }
        .detail-value {
            color: #2d3748;
            text-transform: capitalize;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 24px 0;
            transition: transform 0.2s ease;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .warning-box {
            background-color: #fef5e7;
            border: 1px solid #f6ad55;
            border-radius: 6px;
            padding: 16px;
            margin: 24px 0;
        }
        .warning-text {
            color: #c05621;
            font-size: 14px;
            margin: 0;
        }
        .steps {
            margin: 24px 0;
        }
        .step {
            display: flex;
            align-items: flex-start;
            margin-bottom: 16px;
        }
        .step-number {
            background-color: #667eea;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            margin-right: 12px;
            flex-shrink: 0;
        }
        .step-text {
            color: #4a5568;
            line-height: 1.5;
        }
        .footer {
            background-color: #f7fafc;
            padding: 24px 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            color: #718096;
            font-size: 14px;
            margin: 0;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 0;
                border-radius: 0;
            }
            .header, .content, .footer {
                padding: 24px 20px;
            }
            .detail-row {
                flex-direction: column;
            }
            .detail-value {
                margin-top: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>🎉 You're Invited!</h1>
            <p>${inviterName} has invited you to join ${organizationName}</p>
        </div>

        <!-- Content -->
        <div class="content">
            <p>Hello,</p>
            
            <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong>. You'll have access to collaborate with the team and contribute to the organization's projects.</p>

            <!-- Invitation Details -->
            <div class="invitation-details">
                <h3 style="margin-top: 0; color: #2d3748;">Invitation Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Organization:</span>
                    <span class="detail-value">${organizationName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Your Role:</span>
                    <span class="detail-value">${role}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Invited by:</span>
                    <span class="detail-value">${inviterName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Invitation expires:</span>
                    <span class="detail-value">${formattedExpiresAt}</span>
                </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center;">
                <a href="${invitationLink}" class="cta-button">Accept Invitation</a>
            </div>

            <!-- Steps -->
            <div class="steps">
                <h3 style="color: #2d3748; margin-bottom: 16px;">What happens next?</h3>
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-text">Click the "Accept Invitation" button above</div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-text">Create your account or sign in if you already have one</div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-text">Start collaborating with your new team!</div>
                </div>
            </div>

            <!-- Warning -->
            <div class="warning-box">
                <p class="warning-text">
                    ⏰ <strong>Important:</strong> This invitation expires on ${formattedExpiresAt}. If you don't accept it by then, you'll need to request a new invitation from ${inviterName}.
                </p>
            </div>

            <!-- Alternative Link -->
            <p style="color: #718096; font-size: 14px; margin-top: 32px;">
                If the button above doesn't work, you can copy and paste this link into your browser:<br>
                <a href="${invitationLink}" style="color: #667eea; word-break: break-all;">${invitationLink}</a>
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>
                This invitation was sent to <strong>${inviteeEmail}</strong>.<br>
                If you didn't expect this invitation, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

export function generateInvitationEmailText({
  inviteeEmail,
  inviterName,
  organizationName,
  role,
  invitationLink,
  expiresAt,
}: InvitationEmailProps): string {
  const formattedExpiresAt = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
🎉 You're Invited to Join ${organizationName}!

Hello,

${inviterName} has invited you to join ${organizationName} as a ${role}. You'll have access to collaborate with the team and contribute to the organization's projects.

INVITATION DETAILS:
• Organization: ${organizationName}
• Your Role: ${role}
• Invited by: ${inviterName}
• Invitation expires: ${formattedExpiresAt}

ACCEPT YOUR INVITATION:
${invitationLink}

WHAT HAPPENS NEXT?
1. Click the invitation link above
2. Create your account or sign in if you already have one
3. Start collaborating with your new team!

⏰ IMPORTANT: This invitation expires on ${formattedExpiresAt}. If you don't accept it by then, you'll need to request a new invitation from ${inviterName}.

---

This invitation was sent to ${inviteeEmail}.
If you didn't expect this invitation, you can safely ignore this email.
  `.trim();
}
