import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { db } from '../../shared/db/client.js';
import { getEmailService } from '../../shared/email/index.js';
import { ValidationError, ConflictError, NotFoundError } from '../../shared/errors.js';
import { eq } from 'drizzle-orm';
import { WaitlistRepository } from './repository.js';
import { buildWelcomeEmail, type WaitlistSource } from './templates.js';
import { waitlistSignups } from '../../shared/db/schema/waitlist.js';
import { buildDripContext, renderDripEmail } from '../../shared/email/drip-templates.js';
import { verifyUnsubscribeToken } from '../../shared/queue/drip-sender.js';

function unsubscribeTokenFor(signupId: string): string {
  return createHash('sha256').update(`${signupId}:${process.env.ENCRYPTION_KEY}`).digest('hex').slice(0, 32);
}
void buildWelcomeEmail; // keep export usable by callers; deprecated in favor of drip
type _ = WaitlistSource; // silence unused
void {} as _ | undefined;

const SourceSchema = z.enum(['umbrella', 'voice', 'words', 'match']);
const LocaleSchema = z.enum(['es', 'en', 'pt-BR']).default('es');

const SignupBodySchema = z.object({
  email: z.string().email().max(254),
  source: SourceSchema.default('umbrella'),
  locale: LocaleSchema,
  referrer: z.string().max(255).optional(),
  utmSource: z.string().max(64).optional(),
  utmMedium: z.string().max(64).optional(),
  utmCampaign: z.string().max(64).optional(),
});

const ConfirmQuerySchema = z.object({
  id: z.string().uuid(),
  t: z.string().min(32).max(128),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ValidationError('common.validation_failed', 'Invalid request', { issues: err.issues });
    }
    throw err;
  }
}

export async function waitlistModule(app: FastifyInstance) {
  const repo = new WaitlistRepository(db);
  const email = getEmailService();

  // POST /v1/waitlist — create signup, send welcome+confirm email
  app.post('/', async (req, reply) => {
    const body = parse(SignupBodySchema, req.body);

    const existing = await repo.findByEmail(body.email);
    if (existing && existing.status !== 'unsubscribed') {
      // Idempotent + privacy-preserving: don't leak that email is already on the list.
      // Re-send confirmation if pending.
      if (existing.status === 'pending' && existing.confirmTokenHash) {
        // Cannot recover original token; best-effort: return generic success without re-sending.
      }
      reply.code(202);
      return { ok: true, alreadyOnList: true };
    }

    const confirmToken = randomBytes(32).toString('hex');
    const confirmTokenHash = createHash('sha256').update(confirmToken).digest('hex');

    const row = await repo.create({
      email: body.email,
      source: body.source ?? 'umbrella',
      locale: body.locale ?? 'es',
      confirmTokenHash,
      referrer: body.referrer ?? null,
      utmSource: body.utmSource ?? null,
      utmMedium: body.utmMedium ?? null,
      utmCampaign: body.utmCampaign ?? null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });

    // Send the day-0 drip email (welcome + confirm). Subsequent emails are sent by the
    // scheduled drip-sender job at days 2, 5, 10, 17, 30.
    const ctx = buildDripContext({
      signupId: row.id,
      email: row.email,
      source: row.source as 'umbrella' | 'voice' | 'words' | 'match',
      confirmToken,
      unsubscribeToken: unsubscribeTokenFor(row.id),
    });
    const rendered = renderDripEmail(0, ctx);

    try {
      await email.send({ to: row.email, subject: rendered.subject, html: rendered.html, text: rendered.text });
      await db.update(waitlistSignups).set({ dripStep: 1, dripLastSentAt: new Date() }).where(eq(waitlistSignups.id, row.id));
    } catch (err) {
      req.log.error({ err, signupId: row.id }, 'waitlist.email.send_failed');
      // We do NOT throw — signup is persisted and the drip-sender job will retry.
    }

    reply.code(201);
    return { ok: true, signupId: row.id };
  });

  // GET /v1/waitlist/unsubscribe?id=...&t=...
  app.get('/unsubscribe', async (req) => {
    const q = parse(z.object({ id: z.string().uuid(), t: z.string().min(16).max(64) }), req.query);
    if (!verifyUnsubscribeToken(q.id, q.t)) {
      throw new NotFoundError('waitlist.unsubscribe.invalid', 'Invalid unsubscribe link');
    }
    await db
      .update(waitlistSignups)
      .set({ status: 'unsubscribed', unsubscribedAt: new Date(), updatedAt: new Date() })
      .where(eq(waitlistSignups.id, q.id));
    return { ok: true, status: 'unsubscribed' };
  });

  // GET /v1/waitlist/confirm?id=...&t=... — confirms email
  app.get('/confirm', async (req) => {
    const q = parse(ConfirmQuerySchema, req.query);
    const row = await repo.findById(q.id);
    if (!row || !row.confirmTokenHash) throw new NotFoundError('waitlist.not_found', 'Invalid confirmation link');

    const provided = createHash('sha256').update(q.t).digest();
    const stored = Buffer.from(row.confirmTokenHash, 'hex');
    if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
      throw new NotFoundError('waitlist.not_found', 'Invalid confirmation link');
    }

    if (row.status === 'pending') {
      await repo.confirm(row.id);
    }
    return { ok: true, status: 'confirmed' };
  });
}
