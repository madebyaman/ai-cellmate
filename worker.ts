#!/usr/bin/env tsx

import { createEmailWorker } from './app/lib/queue.server.js';

console.log('Starting BullMQ worker...');

// Create and start the email worker
const emailWorker = createEmailWorker();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await emailWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await emailWorker.close();
  process.exit(0);
});

console.log('Worker started successfully!');