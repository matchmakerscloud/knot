/**
 * Drip sender — runs as a scheduled job (every 30 min).
 * For each waitlist signup at the right cadence, send the next email and bump drip_step.
 */
import { createHash } from 'node:crypto';
import { and, eq, lt, sql } from 'drizzle-orm';
import pino from 'pino';
import { db } from '../db/client.js';
import { waitlistSignups } from '../db/schema/waitlist.js';
import { getEmailService } from '../email/index.js';
import {
  DRIP_SCHEDULE_DAYS,
  buildDripContext,
  renderDripEmail,
  type DripStep,
} from '../email/drip-templates.js';
import { config } from '../../config/index.js';

const log = pino({ name: 'knot-drip', level: process.env.LOG_LEVEL ?? 'info' });

const TOTAL_STEPS = 6;

function unsubscribeToken(signupId: string): string {
  // Deterministic, derived from signupId + master key — verifiable without DB lookup
  return createHash('sha256').update(`${signupId}:${config.encryptionKey}`).digest('hex').slice(0, 32);
}

export function verifyUnsubscribeToken(signupId: string, token: string): boolean {
  return token === unsubscribeToken(signupId);
}

/**
 * Pick all signups that should receive their next email now.
 * Conditions:
 *   - status != 'unsubscribed'
 *   - drip_step < 6
 *   - drip_last_sent_at is null OR (now - drip_last_sent_at) >= cadence(drip_step)
 *   - For step 0: created_at <= now (always true)
 */
export async function runDripSender(): Promise<{ sent: number; failed: number }> {
  const due = await db
    .select()
    .from(waitlistSignups)
    .where(
      and(
        sql`${waitlistSignups.status} != 'unsubscribed'`,
        lt(waitlistSignups.dripStep, TOTAL_STEPS),
      ),
    )
    .limit(500); // safety cap per run

  const now = Date.now();
  let sent = 0;
  let failed = 0;
  const email = getEmailService();

  for (const row of due) {
    const step = row.dripStep as DripStep;
    const cadenceDays = DRIP_SCHEDULE_DAYS[step];
    const referenceTs = row.dripLastSentAt ? row.dripLastSentAt.getTime() : row.createdAt.getTime();
    const dueAt = referenceTs + cadenceDays * 24 * 60 * 60 * 1000;
    if (dueAt > now) continue;

    const ctx = buildDripContext({
      signupId: row.id,
      email: row.email,
      source: row.source as 'umbrella' | 'voice' | 'words' | 'match',
      ...(row.confirmTokenHash ? {} : {}), // confirmToken not stored in plaintext — only step 0 had access at creation
      unsubscribeToken: unsubscribeToken(row.id),
    });
    const rendered = renderDripEmail(step, ctx);

    try {
      await email.send({
        to: row.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      await db
        .update(waitlistSignups)
        .set({
          dripStep: step + 1,
          dripLastSentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(waitlistSignups.id, row.id));
      sent++;
      log.info({ id: row.id, step, to: row.email }, 'drip.email.sent');
    } catch (err) {
      failed++;
      log.error({ id: row.id, step, err: (err as Error).message }, 'drip.email.failed');
    }
  }

  return { sent, failed };
}
