import { Queue } from 'bullmq';
import { defaultQueueOptions, defaultJobOptions } from './config';
import type {
  EmailJobData,
  MagicLinkEmailJobData,
  OrganizationInviteEmailJobData,
  BatchEmailJobData,
  CsvEnrichmentJobData,
} from './types';

// Queue instances
export const emailQueue = new Queue('email', defaultQueueOptions);
export const csvEnrichmentQueue = new Queue('csv-enrichment', defaultQueueOptions);

// Job helper functions
export async function addEmailJob(data: EmailJobData, options = {}) {
  return await emailQueue.add('send-email', data, {
    ...defaultJobOptions,
    ...options,
  });
}

export async function addMagicLinkEmailJob(data: MagicLinkEmailJobData, options = {}) {
  return await emailQueue.add('send-magic-link', data, {
    ...defaultJobOptions,
    ...options,
  });
}

export async function addOrganizationInviteEmailJob(data: OrganizationInviteEmailJobData, options = {}) {
  return await emailQueue.add('send-organization-invite', data, {
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

export async function addCsvEnrichmentJob(
  data: CsvEnrichmentJobData,
  options = {}
) {
  return await csvEnrichmentQueue.add('enrich-csv', data, {
    ...defaultJobOptions,
    ...options,
  });
}
