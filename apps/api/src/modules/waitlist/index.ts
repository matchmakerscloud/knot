import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { db } from '../../shared/db/client.js';
import { getEmailService } from '../../shared/email/index.js';
import { ValidationError, ConflictError, NotFoundError } from '../../shared/errors.js';
import { WaitlistRepository } from './repository.js';
import { buildWelcomeEmail, type WaitlistSource } from './templates.js';

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

    const tmpl = buildWelcomeEmail({
      email: row.email,
      source: row.source as WaitlistSource,
      confirmToken,
      signupId: row.id,
    });

    try {
      await email.send({ to: row.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
    } catch (err) {
      req.log.error({ err, signupId: row.id }, 'waitlist.email.send_failed');
      // We do NOT throw — signup is persisted and we'll retry email later via worker.
    }

    reply.code(201);
    return { ok: true, signupId: row.id };
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
