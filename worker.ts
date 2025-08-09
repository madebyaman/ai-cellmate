#!/usr/bin/env tsx

import { createAllWorkers } from './app/queues/workers/index';

console.log('Starting BullMQ worker...');

// Get worker types from environment or default to all
const [workers, workerTypes] = createAllWorkers();

console.log(`Started ${workers.length} worker(s): ${workerTypes.join(', ')}`);

// Handle graceful shutdown
const shutdown = async () => {
  console.log('Shutting down workers...');
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('Workers started successfully!');
