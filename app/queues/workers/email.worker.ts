import { Worker } from 'bullmq';
import { redisConnection } from '../config';
import type { EmailJobData, BatchEmailJobData, EmailJobDataUnion, EmailJobResult, BatchEmailJobResult } from '../types';

export function createEmailWorker(): Worker<EmailJobDataUnion, EmailJobResult | BatchEmailJobResult, string> {
  return new Worker<EmailJobDataUnion, EmailJobResult | BatchEmailJobResult, string>(
    'email',
    async (job) => {
      console.log(`Processing email job: ${job.name}:${job.id}`);

      switch (job.name) {
        case 'send-email':
          return await processSendEmail(job.data as EmailJobData);
        case 'send-batch-email':
          return await processBatchEmail(job.data as BatchEmailJobData);
        default:
          throw new Error(`Unknown email job type: ${job.name}`);
      }
    },
    { connection: redisConnection }
  );
}

async function processSendEmail(data: EmailJobData): Promise<EmailJobResult> {
  const { to, subject, html } = data;

  // Your email sending logic here
  // await sendEmail(to, subject, html);

  console.log(`Email sent to ${to}`);
  return { success: true, recipient: to };
}

async function processBatchEmail(data: BatchEmailJobData): Promise<BatchEmailJobResult> {
  const { recipients } = data;
  const results: EmailJobResult[] = [];

  for (const recipient of recipients) {
    try {
      // Your email sending logic here
      // await sendEmail(recipient.to, recipient.subject, recipient.html);

      console.log(`Batch email sent to ${recipient.to}`);
      results.push({ success: true, recipient: recipient.to });
    } catch (error) {
      console.error(`Failed to send email to ${recipient.to}:`, error);
      results.push({
        success: false,
        recipient: recipient.to,
        error: error instanceof Error ? error.message : 'Unknown error',
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
