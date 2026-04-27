import { Queue, Worker, QueueEvents, type ConnectionOptions } from 'bullmq';
import { eq, lte, and, sql } from 'drizzle-orm';
import pino from 'pino';
import { db } from '../db/client.js';
import { voiceReplies } from '../db/schema/voice-feed.js';
import { matchPresentations, matchProfiles } from '../db/schema/match.js';
import { users } from '../db/schema/users.js';
import { blocks } from '../db/schema/safety.js';
import { createPresentation } from '../../modules/match/service.js';
import { runDripSender } from './drip-sender.js';
import { getQueueConnection } from './index.js';

const log = pino({ name: 'knot-scheduled', level: process.env.LOG_LEVEL ?? 'info' });

export const SCHEDULED_QUEUE = 'scheduled';

export type ScheduledJobName = 'expire-voice-replies' | 'daily-match-presentations' | 'expire-words-likes' | 'drip-sender';

export function getScheduledQueue(connection: ConnectionOptions): Queue {
  return new Queue(SCHEDULED_QUEUE, { connection, defaultJobOptions: { removeOnComplete: { age: 86400, count: 100 }, removeOnFail: { age: 604800 } } });
}

/**
 * Register repeating jobs (idempotent — BullMQ uses jobId for dedup).
 * - expire-voice-replies: every 6h
 * - expire-words-likes: every 6h
 * - daily-match-presentations: every 24h at 14:00 UTC (~9am Santiago, ~10am CDMX)
 */
export async function registerScheduledJobs(connection: ConnectionOptions): Promise<void> {
  const q = getScheduledQueue(connection);
  await q.upsertJobScheduler('expire-voice-replies', { every: 6 * 60 * 60 * 1000 }, { name: 'expire-voice-replies' });
  await q.upsertJobScheduler('expire-words-likes', { every: 6 * 60 * 60 * 1000 }, { name: 'expire-words-likes' });
  await q.upsertJobScheduler('daily-match-presentations', { pattern: '0 14 * * *' }, { name: 'daily-match-presentations' });
  await q.upsertJobScheduler('drip-sender', { every: 30 * 60 * 1000 }, { name: 'drip-sender' });
  log.info('scheduled jobs registered');
  await q.close();
}

/**
 * Worker process for scheduled jobs.
 */
export function startScheduledWorker(connection: ConnectionOptions): Worker<unknown> {
  const worker = new Worker<unknown>(
    SCHEDULED_QUEUE,
    async (job) => {
      switch (job.name as ScheduledJobName) {
        case 'expire-voice-replies':
          return expireVoiceReplies();
        case 'expire-words-likes':
          return expireWordsLikes();
        case 'daily-match-presentations':
          return dailyMatchPresentations();
        case 'drip-sender':
          return runDripSender();
        default:
          log.warn({ name: job.name }, 'scheduled.unknown_job');
          return;
      }
    },
    { connection, concurrency: 1 },
  );

  const events = new QueueEvents(SCHEDULED_QUEUE, { connection });
  events.on('completed', ({ jobId }) => log.info({ jobId }, 'scheduled.job.completed'));
  events.on('failed', ({ jobId, failedReason }) => log.error({ jobId, failedReason }, 'scheduled.job.failed'));

  worker.on('error', (err) => log.error({ err: err.message }, 'scheduled.worker.error'));

  log.info('scheduled worker ready');
  return worker;
}

/**
 * Expire voice replies whose expires_at passed and status='pending' or 'replied_back' but no chamber.
 * (replied_back replies always have a chamber, so practically only 'pending' targets; we mark them 'expired'.)
 */
async function expireVoiceReplies(): Promise<{ expired: number }> {
  const result = await db
    .update(voiceReplies)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(and(eq(voiceReplies.status, 'pending'), lte(voiceReplies.expiresAt, new Date())));
  log.info({ count: result.length ?? 0 }, 'voice_replies.expired');
  return { expired: result.length ?? 0 };
}

async function expireWordsLikes(): Promise<{ expired: number }> {
  // Defensive raw SQL — words_likes uses different column names; works without an additional import
  await db.execute(sql`UPDATE words_likes SET status='expired' WHERE status='pending' AND expires_at <= NOW()`);
  return { expired: 0 };
}

/**
 * Daily candidate selection per spec §3.2 (simplified MVP):
 * For each user with a complete match_profile and no pending presentation:
 *   - Find candidates: opposite-but-compatible orientation (TBD; for MVP skip orientation filter,
 *     only requires both profiles complete and not blocked either way)
 *   - Pick top-1 by simple heuristic (random for MVP — algorithm refinement is the bigger task)
 *   - Generate dossier + persist as 'pending_review'
 * Spec §6.3 says: human review in MVP. So presentations end up in pending_review for an admin.
 */
async function dailyMatchPresentations(): Promise<{ generated: number }> {
  const ready = await db
    .select({ userId: matchProfiles.userId })
    .from(matchProfiles)
    .where(eq(matchProfiles.onboardingStatus, 'complete'));

  let generated = 0;
  for (const u of ready) {
    // Skip users with an open presentation already
    const open = await db
      .select({ id: matchPresentations.id })
      .from(matchPresentations)
      .where(
        and(
          eq(matchPresentations.presentedToId, u.userId),
          sql`${matchPresentations.status} IN ('pending_review','queued','shown')`,
        ),
      )
      .limit(1);
    if (open.length > 0) continue;

    // Find a candidate: any other user with complete profile, not blocked by/blocking, not already presented to this user
    const candidates = await db
      .select({ userId: matchProfiles.userId })
      .from(matchProfiles)
      .innerJoin(users, eq(users.id, matchProfiles.userId))
      .where(
        and(
          eq(matchProfiles.onboardingStatus, 'complete'),
          sql`${matchProfiles.userId} != ${u.userId}`,
          sql`NOT EXISTS (SELECT 1 FROM ${blocks} b WHERE (b.blocker_id = ${u.userId} AND b.blocked_id = ${matchProfiles.userId}) OR (b.blocker_id = ${matchProfiles.userId} AND b.blocked_id = ${u.userId}))`,
          sql`NOT EXISTS (SELECT 1 FROM ${matchPresentations} mp WHERE mp.presented_to_id = ${u.userId} AND mp.presented_user_id = ${matchProfiles.userId})`,
        ),
      )
      .limit(20);

    if (candidates.length === 0) continue;

    // Random pick for MVP. Future: cosine sim of embeddings + values_json scoring.
    const pick = candidates[Math.floor(Math.random() * candidates.length)]!;
    try {
      await createPresentation(u.userId, pick.userId);
      generated++;
      log.info({ to: u.userId, present: pick.userId }, 'match.presentation.generated');
    } catch (err) {
      log.error({ err: (err as Error).message, to: u.userId, present: pick.userId }, 'match.presentation.failed');
    }
  }
  return { generated };
}

/**
 * One-shot helpers — used by the worker entrypoint and by manual triggers (admin endpoint).
 */
export const Scheduled = {
  expireVoiceReplies,
  expireWordsLikes,
  dailyMatchPresentations,
};

void getQueueConnection; // silence unused if any
