/**
 * Email template generators that return plain HTML and text
 * These are used by the email worker which runs in a separate Node.js process
 */

const BASE_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { margin-bottom: 30px; }
  h1 { font-size: 24px; margin: 0 0 10px 0; color: #1f2937; }
  .content { margin: 20px 0; }
  .button { display: inline-block; padding: 12px 24px; background-color: #155dfb; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  p { margin: 15px 0; }
  .text-muted { font-size: 12px; color: #6b7280; }
  strong { color: #1f2937; }
`;

/**
 * Base HTML template wrapper
 */
function baseTemplate(title: string, content: string, footer: string): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <style>${BASE_STYLES}</style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${escapeHtml(title)}</h1>
      </div>
      <div class="content">${content}</div>
      <div class="footer">${footer}</div>
    </div>
  </body>
</html>
  `.trim();
}

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function generateMagicLinkEmailTemplate(
  email: string,
  magicLink: string,
): { html: string; text: string } {
  const content = `
    <p>Hi,</p>
    <p>Click the button below to sign in to your account:</p>
    <a href="${escapeHtml(magicLink)}" class="button">Sign in</a>
    <p>Or copy and paste this link if the button doesn't work:</p>
    <p style="word-break: break-all;"><a href="${escapeHtml(magicLink)}">${escapeHtml(magicLink)}</a></p>
  `;

  const footer = `
    <p class="text-muted">This link expires in 24 hours.</p>
    <p class="text-muted">If you didn't request this email, you can safely ignore it.</p>
  `;

  const html = baseTemplate("Sign in to your account", content, footer);

  const text = `
Sign in to your account

Hi ${email},

Click this link to sign in to your account:
${magicLink}

This link expires in 24 hours.
If you didn't request this email, you can safely ignore it.
  `.trim();

  return { html, text };
}

export function generateOrganizationInviteEmailTemplate(
  inviterName: string,
  organizationName: string,
  inviteLink: string,
): { html: string; text: string } {
  const content = `
    <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(organizationName)}</strong>.</p>
    <p>Click the button below to accept the invitation:</p>
    <a href="${escapeHtml(inviteLink)}" class="button">Accept Invitation</a>
    <p>Or copy and paste this link if the button doesn't work:</p>
    <p style="word-break: break-all;"><a href="${escapeHtml(inviteLink)}">${escapeHtml(inviteLink)}</a></p>
  `;

  const footer = `
    <p class="text-muted">You received this email because you were invited to join an organization.</p>
  `;

  const html = baseTemplate(
    `You're invited to join ${escapeHtml(organizationName)}`,
    content,
    footer,
  );

  const text = `
You're invited to join ${organizationName}

${inviterName} has invited you to join ${organizationName}.

Click this link to accept the invitation:
${inviteLink}

You received this email because you were invited to join an organization.
  `.trim();

  return { html, text };
}
