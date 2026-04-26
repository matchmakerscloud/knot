import { Queue, type ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../../config/index.js';

let connection: ConnectionOptions | undefined;

export function getQueueConnection(): ConnectionOptions {
  if (connection) return connection;
  // BullMQ requires `maxRetriesPerRequest: null`. Build options manually so config is explicit.
  connection = {
    url: config.redisUrl,
    maxRetriesPerRequest: null,
  };
  return connection;
}

export function makeRedis(): Redis {
  return new Redis(config.redisUrl, { maxRetriesPerRequest: null });
}

// Queue names (single source of truth)
export const QUEUES = {
  voiceProcessing: 'voice-processing',
} as const;

let voiceQueue: Queue | undefined;

export function getVoiceQueue(): Queue {
  if (!voiceQueue) {
    voiceQueue = new Queue(QUEUES.voiceProcessing, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
        removeOnFail: { age: 60 * 60 * 24 * 7 },
      },
    });
  }
  return voiceQueue;
}

export interface VoiceProcessingJobData {
  recordingId: string;
  userId: string;
  storageKey: string;
  contentType: string;
}
