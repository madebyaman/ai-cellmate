import { Queue } from 'bullmq';
import { defaultQueueOptions, defaultJobOptions } from './config';
import type {
  EmailJobData,
  BatchEmailJobData,
  NotificationJobData,
  ImageJobData,
} from './types';

// Queue instances
export const emailQueue = new Queue('email', defaultQueueOptions);
export const notificationQueue = new Queue('notification', defaultQueueOptions);
export const imageQueue = new Queue('image', defaultQueueOptions);

// Job helper functions
export async function addEmailJob(data: EmailJobData, options = {}) {
  return await emailQueue.add('send-email', data, {
    ...defaultJobOptions,
    ...options,
  });
}

export async function addBatchEmailJob(data: BatchEmailJobData, options = {}) {
  return await emailQueue.add('send-batch-email', data, {
    ...defaultJobOptions,
    ...options,
  });
}

export async function addNotificationJob(
  data: NotificationJobData,
  options = {}
) {
  return await notificationQueue.add('send-notification', data, {
    ...defaultJobOptions,
    ...options,
  });
}

export async function addImageJob(
  jobType: string,
  data: ImageJobData,
  options = {}
) {
  return await imageQueue.add(jobType, data, {
    ...defaultJobOptions,
    ...options,
  });
}
