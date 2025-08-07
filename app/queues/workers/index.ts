import { createEmailWorker } from './email.worker';

// Export all worker creation functions
export { createEmailWorker };

// Helper to create all workers
export function createAllWorkers() {
  const workers = [
    createEmailWorker(),
    // Add more workers as you create them
    // createNotificationWorker(),
    // createImageWorker(),
  ];

  return workers;
}
