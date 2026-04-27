/**
 * Knot worker process.
 *
 * Runs as a separate node process from the API. Pulls jobs from BullMQ queues
 * (powered by Redis) and runs background pipelines: voice processing today,
 * dossier generation + push notifications later.
 *
 * Started by systemd unit knot-worker.service.
 */
import { Worker } from 'bullmq';
import pino from 'pino';
import { QUEUES, getQueueConnection } from './shared/queue/index.js';
import type { VoiceProcessingJobData } from './shared/queue/index.js';
import { processVoiceRecording } from './shared/queue/voice-processing.js';
import { registerScheduledJobs, startScheduledWorker } from './shared/queue/scheduled.js';

const log = pino({ name: 'knot-worker', level: process.env.LOG_LEVEL ?? 'info' });

async function main() {
  const conn = getQueueConnection();

  const voiceWorker = new Worker<VoiceProcessingJobData>(
    QUEUES.voiceProcessing,
    async (job) => {
      log.info({ jobId: job.id, recordingId: job.data.recordingId }, 'voice.job.start');
      const out = await processVoiceRecording(job);
      log.info({ jobId: job.id, status: out.status }, 'voice.job.done');
      return out;
    },
    { connection: conn, concurrency: 2 },
  );

  voiceWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err: err.message, stack: err.stack }, 'voice.job.failed');
  });
  voiceWorker.on('error', (err) => {
    log.error({ err: err.message }, 'voice.worker.error');
  });

  // Scheduled jobs (cron-style): expire voice replies / words likes, daily match presentations
  await registerScheduledJobs(conn);
  const scheduledWorker = startScheduledWorker(conn);

  log.info('Knot worker ready — voice + scheduled queues active');

  const shutdown = async (sig: string) => {
    log.info({ sig }, 'shutting down');
    await Promise.all([voiceWorker.close(), scheduledWorker.close()]);
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  log.fatal({ err: err.message, stack: err.stack }, 'worker.start.failed');
  process.exit(1);
});
