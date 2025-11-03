// Email job types
export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

export interface MagicLinkEmailJobData {
  to: string;
  magicLink: string;
}

export interface OrganizationInviteEmailJobData {
  to: string;
  inviterName: string;
  organizationName: string;
  inviteLink: string;
}

export interface BatchEmailJobData {
  recipients: Array<{
    to: string;
    subject: string;
    html: string;
  }>;
}

// Add more job types as needed
export interface NotificationJobData {
  userId: string;
  message: string;
  type: 'push' | 'sms' | 'in-app';
}

export interface ImageJobData {
  imageUrl: string;
  outputFormat: 'webp' | 'jpeg' | 'png';
  width?: number;
  height?: number;
}

// CSV enrichment job types
export interface CsvEnrichmentJobData {
  runId: string;
  userId: string;
}

// Union types for all job data
export type EmailJobDataUnion = EmailJobData | MagicLinkEmailJobData | OrganizationInviteEmailJobData | BatchEmailJobData;
export type CsvEnrichmentJobDataUnion = CsvEnrichmentJobData;

// Job result types
export interface EmailJobResult {
  success: boolean;
  recipient: string;
  error?: string;
}

export interface BatchEmailJobResult {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results: EmailJobResult[];
}

export interface CsvEnrichmentJobResult {
  success: boolean;
  userId?: string;
  processedAt: string;
}
