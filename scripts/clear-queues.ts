import { Queue } from 'bullmq';
import { defaultQueueOptions } from '../app/queues/config';

const queueNames = ['email', 'notification', 'image', 'csv-enrichment'];

async function clearAllQueues() {
  console.log('🧹 Starting queue cleanup...\n');

  for (const queueName of queueNames) {
    const queue = new Queue(queueName, defaultQueueOptions);

    try {
      // Clean all job states
      await queue.obliterate({ force: true });
      console.log(`✅ Cleared queue: ${queueName}`);
    } catch (error) {
      console.error(`❌ Error clearing queue ${queueName}:`, error);
    } finally {
      await queue.close();
    }
  }

  console.log('\n✨ Queue cleanup complete!');
  process.exit(0);
}

clearAllQueues().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
