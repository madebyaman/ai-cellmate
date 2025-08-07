import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Example queue - customize as needed
export const emailQueue = new Queue('email', { connection });

// Job types
export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

// Add job to queue
export async function addEmailJob(data: EmailJobData) {
  return await emailQueue.add('send-email', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

// Worker (runs in separate process)
export function createEmailWorker() {
  return new Worker(
    'email',
    async (job) => {
      console.log('Processing email job:', job.id);
      const { to, subject, html } = job.data as EmailJobData;

      // Your email sending logic here
      // await sendEmail(to, subject, html);

      console.log(`Email sent to ${to}`);
      return { success: true };
    },
    { connection }
  );
}
