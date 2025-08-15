import IORedis from 'ioredis';

// Redis connection configuration
export const redisConnection = process.env.REDIS_URL 
  ? new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    })
  : new IORedis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });

// Default queue options
export const defaultQueueOptions = {
  connection: redisConnection,
};

// Default job options
export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: 10,
  removeOnFail: 5,
};