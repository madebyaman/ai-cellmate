import { Worker } from "bullmq";
import { redisConnection } from "../config";
import type {
  EmailJobData,
  MagicLinkEmailJobData,
  OrganizationInviteEmailJobData,
  BatchEmailJobData,
  EmailJobDataUnion,
  EmailJobResult,
  BatchEmailJobResult,
} from "../types";
import sendEmail from "~/utils/email.server";
import {
  generateMagicLinkEmailTemplate,
  generateOrganizationInviteEmailTemplate,
} from "~/utils/email-templates";

export function createEmailWorker(): Worker<
  EmailJobDataUnion,
  EmailJobResult | BatchEmailJobResult,
  string
> {
  return new Worker<
    EmailJobDataUnion,
    EmailJobResult | BatchEmailJobResult,
    string
  >(
    "email",
    async (job) => {
      switch (job.name) {
        case "send-email":
          return await processSendEmail(job.data as EmailJobData);
        case "send-magic-link":
          return await processMagicLinkEmail(job.data as MagicLinkEmailJobData);
        case "send-organization-invite":
          return await processOrganizationInviteEmail(
            job.data as OrganizationInviteEmailJobData,
          );
        case "send-batch-email":
          return await processBatchEmail(job.data as BatchEmailJobData);
        default:
          throw new Error(`Unknown email job type: ${job.name}`);
      }
    },
    { connection: redisConnection },
  );
}

async function processSendEmail(data: EmailJobData): Promise<EmailJobResult> {
  const { to, subject, html } = data;

  // Your email sending logic here
  // await sendEmail(to, subject, html);

  return { success: true, recipient: to };
}

async function processMagicLinkEmail(
  data: MagicLinkEmailJobData,
): Promise<EmailJobResult> {
  const { to, magicLink } = data;

  try {
    const { html, text } = generateMagicLinkEmailTemplate(to, magicLink);
    const result = await sendEmail({
      to,
      subject: "Sign in to your account",
      html,
      text,
    });

    if (result.status === "success") {
      return { success: true, recipient: to };
    } else {
      console.error(
        `[MAGIC_LINK] Failed to send email to ${to}:`,
        result.error,
      );
      return {
        success: false,
        recipient: to,
        error: result.error || "Failed to send email",
      };
    }
  } catch (error) {
    console.error(
      `[MAGIC_LINK] Error processing magic link email for ${to}:`,
      error,
    );
    return {
      success: false,
      recipient: to,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function processOrganizationInviteEmail(
  data: OrganizationInviteEmailJobData,
): Promise<EmailJobResult> {
  const { to, inviterName, organizationName, inviteLink } = data;

  try {
    const { html, text } = generateOrganizationInviteEmailTemplate(
      inviterName,
      organizationName,
      inviteLink,
    );
    const result = await sendEmail({
      to,
      subject: `You're invited to join ${organizationName}`,
      html,
      text,
    });

    if (result.status === "success") {
      return { success: true, recipient: to };
    } else {
      console.error(
        `[ORG_INVITE] Failed to send email to ${to}:`,
        result.error,
      );
      return {
        success: false,
        recipient: to,
        error: result.error || "Failed to send email",
      };
    }
  } catch (error) {
    console.error(
      `[ORG_INVITE] Error processing organization invite email for ${to}:`,
      error,
    );
    return {
      success: false,
      recipient: to,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function processBatchEmail(
  data: BatchEmailJobData,
): Promise<BatchEmailJobResult> {
  const { recipients } = data;
  const results: EmailJobResult[] = [];

  for (const recipient of recipients) {
    try {
      // Your email sending logic here
      // await sendEmail(recipient.to, recipient.subject, recipient.html);

      results.push({ success: true, recipient: recipient.to });
    } catch (error) {
      console.error(`Failed to send email to ${recipient.to}:`, error);
      results.push({
        success: false,
        recipient: recipient.to,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    success: true,
    totalSent: results.filter((r) => r.success).length,
    totalFailed: results.filter((r) => !r.success).length,
    results,
  };
}
