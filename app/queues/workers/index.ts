import { Worker } from 'bullmq';
import { createEmailWorker } from './email.worker';
import { createCsvEnrichmentWorker } from './csv-enrichment.worker';

// Export all worker creation functions
export { createEmailWorker, createCsvEnrichmentWorker };

// Helper to create all workers
export function createAllWorkers(): [Worker[], string[]] {
  const workers = [
    createEmailWorker(),
    createCsvEnrichmentWorker(),
    // Add more workers as you create them
    // createNotificationWorker(),
    // createImageWorker(),
  ];
  const workerTypes = workers.map((worker) => worker.name);

  return [workers, workerTypes];
}
