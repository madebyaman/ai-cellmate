import { Resend } from "resend";
import type { ReactElement } from "react";
import { render } from "@react-email/components";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
}

interface EmailWithHtmlOptions extends EmailOptions {
  html: string;
  text?: string;
  react?: never;
}

interface EmailWithReactOptions extends EmailOptions {
  react: ReactElement;
  html?: never;
  text?: never;
}

type SendEmailOptions = EmailWithHtmlOptions | EmailWithReactOptions;

/**
 * Type guard to ensure valid email payload for Resend
 */
function isValidEmailPayload(payload: any) {
  return (
    payload.from &&
    payload.to &&
    payload.subject &&
    (payload.html || payload.text)
  );
}

/**
 * Sends an email using Resend service
 * In development, logs to console instead of sending
 */
export default async function sendEmail(options: SendEmailOptions) {
  const from = process.env.RESEND_FROM_EMAIL || "hello@aicellmate.com";

  // Prepare email content
  let emailContent: { html?: string; text?: string } = {};

  if (options.react) {
    const rendered = await renderReactEmail(options.react);
    emailContent = {
      html: rendered.html,
      text: rendered.text,
    };
  } else {
    emailContent = {
      html: options.html,
      text: options.text,
    };
  }

  // // Development mode: log instead of sending
  // if (process.env.NODE_ENV === "development") {
  //   console.log("[EMAIL] Development mode - not sending");
  //   console.log("[EMAIL] To:", options.to);
  //   console.log("[EMAIL] From:", from);
  //   console.log("[EMAIL] Subject:", options.subject);
  //   console.log("[EMAIL] HTML:", emailContent.html);
  //   return { status: "success" } as const;
  // }

  // Production: send via Resend
  try {
    // Build payload ensuring at least html or text is present
    const basePayload = {
      from,
      to: options.to,
      subject: options.subject,
    };

    const payload = emailContent.html
      ? { ...basePayload, html: emailContent.html, text: emailContent.text }
      : { ...basePayload, text: emailContent.text || "" };

    if (!isValidEmailPayload(payload)) {
      throw new Error("Invalid email payload: missing required fields");
    }

    const response = await resend.emails.send(payload);

    if (response.error) {
      console.error("[EMAIL] Failed to send:", response.error);
      return { status: "error", error: response.error.message } as const;
    }

    return { status: "success" } as const;
  } catch (error) {
    console.error("[EMAIL] Error sending email:", error);
    return { status: "error", error: "Failed to send email" } as const;
  }
}

/**
 * Renders React Email component to HTML and plain text
 */
async function renderReactEmail(react: ReactElement) {
  const [html, text] = await Promise.all([
    render(react),
    render(react, { plainText: true }),
  ]);
  return { html, text };
}
