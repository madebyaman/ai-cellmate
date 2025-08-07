// Email job types
export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
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