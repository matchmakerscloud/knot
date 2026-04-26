import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { and, asc, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { getStorage } from '../../shared/storage/index.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { chambers, chamberParticipants, messages } from '../../shared/db/schema/chambers.js';

const SendMessageBody = z.object({
  kind: z.enum(['voice', 'text']),
  body: z.string().min(1).max(2000).optional(),
  voiceStorageKey: z.string().optional(),
  voiceContentType: z.string().optional(),
  voiceDurationSeconds: z.number().min(1).max(120).optional(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  try { return schema.parse(value); }
  catch (err) {
    if (err instanceof ZodError) throw new ValidationError('common.validation_failed', 'Invalid request', { issues: err.issues });
    throw err;
  }
}

async function assertParticipant(chamberId: string, userId: string): Promise<void> {
  const [row] = await db
    .select()
    .from(chamberParticipants)
    .where(and(eq(chamberParticipants.chamberId, chamberId), eq(chamberParticipants.userId, userId), isNull(chamberParticipants.leftAt)))
    .limit(1);
  if (!row) throw new ForbiddenError('chamber.not_participant', 'Not a participant of this chamber');
}

export async function chambersModule(app: FastifyInstance) {
  const storage = getStorage();

  // GET /v1/chambers — chambers I'm in
  app.get('/', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    // chambers where I'm a participant and haven't left
    const myChambers = await db
      .select({ chamber: chambers })
      .from(chambers)
      .innerJoin(chamberParticipants, and(
        eq(chamberParticipants.chamberId, chambers.id),
        eq(chamberParticipants.userId, userId),
        isNull(chamberParticipants.leftAt),
      ))
      .where(eq(chambers.status, 'active'))
      .orderBy(desc(chambers.lastMessageAt));

    if (myChambers.length === 0) return { chambers: [] };

    const chamberIds = myChambers.map((c) => c.chamber.id);

    // For each chamber, find the other participant (anonymized)
    const allParts = await db
      .select()
      .from(chamberParticipants)
      .where(inArray(chamberParticipants.chamberId, chamberIds));

    return {
      chambers: myChambers.map((c) => {
        const other = allParts.find((p) => p.chamberId === c.chamber.id && p.userId !== userId);
        return {
          id: c.chamber.id,
          app: c.chamber.app,
          origin: c.chamber.origin,
          status: c.chamber.status,
          lastMessageAt: c.chamber.lastMessageAt?.toISOString() ?? null,
          createdAt: c.chamber.createdAt.toISOString(),
          otherAnonymousId: other ? 'ses_' + Math.abs(hash(other.userId + userId)).toString(16) : null,
        };
      }),
    };
  });

  // GET /v1/chambers/:id — detail with messages
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>('/:id', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const chamberId = req.params.id;
    await assertParticipant(chamberId, userId);

    const [ch] = await db.select().from(chambers).where(eq(chambers.id, chamberId)).limit(1);
    if (!ch) throw new NotFoundError('chamber.not_found', 'Chamber not found');

    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.chamberId, chamberId))
      .orderBy(asc(messages.createdAt))
      .limit(limit);

    // Sign voice URLs for any voice messages
    const out = await Promise.all(
      msgs.map(async (m) => {
        const base: Record<string, unknown> = {
          id: m.id,
          kind: m.kind,
          body: m.body,
          mine: m.senderId === userId,
          createdAt: m.createdAt.toISOString(),
        };
        if (m.kind === 'voice' && m.voiceStorageKey) {
          const signed = await storage.signDownload(m.voiceStorageKey);
          base.audioUrl = signed.url;
          base.durationSeconds = m.voiceDurationSeconds ? Number(m.voiceDurationSeconds) : null;
          base.waveformPeaks = m.voiceWaveformPeaks ?? [];
          base.transcript = m.voiceTranscript;
        }
        return base;
      }),
    );

    // Update lastReadAt for current participant
    await db
      .update(chamberParticipants)
      .set({ lastReadAt: new Date() })
      .where(and(eq(chamberParticipants.chamberId, chamberId), eq(chamberParticipants.userId, userId)));

    return {
      chamber: {
        id: ch.id,
        app: ch.app,
        origin: ch.origin,
        status: ch.status,
        photoUnlockState: ch.photoUnlockState,
        textUnlockState: ch.textUnlockState,
        createdAt: ch.createdAt.toISOString(),
      },
      messages: out,
    };
  });

  // POST /v1/chambers/:id/messages — send text or voice
  app.post<{ Params: { id: string } }>('/:id/messages', { preHandler: app.requireAuth }, async (req, reply) => {
    const userId = req.auth!.userId;
    const chamberId = req.params.id;
    await assertParticipant(chamberId, userId);

    const [ch] = await db.select().from(chambers).where(eq(chambers.id, chamberId)).limit(1);
    if (!ch) throw new NotFoundError('chamber.not_found', 'Chamber not found');
    if (ch.status !== 'active') throw new ConflictError('chamber.not_active', 'Chamber is not active');

    const body = parse(SendMessageBody, req.body);

    // Voice MVP: chambers from voice_match are voice-only for first 3 days (per spec §3.2).
    if (ch.app === 'voice' && ch.origin === 'voice_match' && body.kind === 'text') {
      const ageMs = Date.now() - ch.createdAt.getTime();
      if (ageMs < 3 * 24 * 60 * 60 * 1000) {
        throw new ConflictError('chamber.text_locked', 'Text is locked for the first 3 days of a Voice chamber');
      }
    }

    if (body.kind === 'voice') {
      if (!body.voiceStorageKey || !body.voiceContentType || !body.voiceDurationSeconds) {
        throw new ValidationError('chamber.voice.missing_fields', 'voiceStorageKey, voiceContentType, voiceDurationSeconds required');
      }
      if (!body.voiceStorageKey.startsWith(`voice/${userId}/`)) {
        throw new ValidationError('chamber.voice.storage_key_mismatch', 'storageKey does not belong to current user');
      }
      if (!(await storage.exists(body.voiceStorageKey))) {
        throw new ValidationError('chamber.voice.upload_missing', 'No object at storageKey');
      }
    } else {
      if (!body.body) throw new ValidationError('chamber.text.empty', 'body required for text message');
    }

    const [row] = await db.insert(messages).values({
      chamberId,
      senderId: userId,
      kind: body.kind,
      body: body.kind === 'text' ? body.body! : null,
      voiceStorageKey: body.kind === 'voice' ? body.voiceStorageKey! : null,
      voiceContentType: body.kind === 'voice' ? body.voiceContentType! : null,
      voiceDurationSeconds: body.kind === 'voice' ? body.voiceDurationSeconds!.toFixed(2) : null,
    }).returning();
    if (!row) throw new Error('chamber.message.insert.failed');

    await db.update(chambers).set({ lastMessageAt: new Date() }).where(eq(chambers.id, chamberId));

    reply.code(201);
    return { id: row.id, kind: row.kind, createdAt: row.createdAt.toISOString() };
  });

  // POST /v1/chambers/:id/close
  app.post<{ Params: { id: string } }>('/:id/close', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const chamberId = req.params.id;
    await assertParticipant(chamberId, userId);
    await db.update(chambers).set({ status: 'closed', closedAt: new Date() }).where(eq(chambers.id, chamberId));
    return { ok: true as const };
  });
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
