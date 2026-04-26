import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { getStorage } from '../../shared/storage/index.js';
import { getVoiceQueue } from '../../shared/queue/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { voiceRecordings } from '../../shared/db/schema/voice.js';
import { chambers, chamberParticipants, messages } from '../../shared/db/schema/chambers.js';
import { VoiceFeedRepository, VoiceRepliesRepository } from './feed.repository.js';

const ReplyBody = z.object({
  storageKey: z.string().min(8).max(512),
  contentType: z.string().min(3).max(80),
  durationSeconds: z.number().min(1).max(60),
});

const SkipBody = z.object({
  durationListenedMs: z.number().int().min(0).optional(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  try { return schema.parse(value); }
  catch (err) {
    if (err instanceof ZodError) throw new ValidationError('common.validation_failed', 'Invalid request', { issues: err.issues });
    throw err;
  }
}

function ageBucket(dob: string): string {
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  const decade = Math.floor(age / 10) * 10;
  const half = age - decade < 5 ? 'tempranos' : 'tardíos';
  return `${decade}s_${half}`;
}

function distanceBucket(_a: { lat?: number; lng?: number }, _b: { lat?: number; lng?: number }): string {
  // Stub: real geo calc via earthdistance once user_preferences table is wired
  return 'cercana';
}

function avatarFor(userId: string): { color: string; shape: string } {
  // Deterministic, anonymous visual identity per session — stable across requests
  const hue = Math.abs(hash(userId)) % 360;
  const shapes = ['wave-1', 'wave-2', 'wave-3', 'wave-4', 'wave-5'];
  const shape = shapes[Math.abs(hash(userId + 'shape')) % shapes.length]!;
  return { color: `hsl(${hue}, 55%, 70%)`, shape };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

export async function voiceFeedRoutes(app: FastifyInstance) {
  const feedRepo = new VoiceFeedRepository(db);
  const repliesRepo = new VoiceRepliesRepository(db);
  const storage = getStorage();

  // GET /v1/voice/feed — return next audio for the user (one at a time, per spec)
  app.get('/feed', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const next = await feedRepo.nextForUser(userId);
    if (!next) return { recording: null, anonymizedUser: null, nextCursor: null };

    // Track view event (informational; doesn't block re-display)
    await feedRepo.recordEvent({ userId, recordingId: next.recording.id, action: 'viewed' });

    const signed = await storage.signDownload(next.recording.storageKey);
    return {
      recording: {
        id: next.recording.id,
        promptText: next.recording.promptTextSnapshot,
        durationSeconds: Number(next.recording.durationSeconds),
        audioUrl: signed.url,
        waveformPeaks: next.recording.waveformPeaks,
        anonymousAvatar: avatarFor(next.recording.userId),
      },
      anonymizedUser: {
        ageBucket: ageBucket(next.user.dateOfBirth),
        distanceBucket: distanceBucket({}, {}),
        anonymousId: 'ses_' + (Math.abs(hash(next.recording.userId + userId))).toString(16),
      },
      nextCursor: null, // single-item stream; client requests again
    };
  });

  // POST /v1/voice/feed/:recordingId/skip
  app.post<{ Params: { recordingId: string } }>('/feed/:recordingId/skip', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const body = req.body ? parse(SkipBody, req.body) : {};
    await feedRepo.recordEvent({
      userId,
      recordingId: req.params.recordingId,
      action: 'skipped',
      durationListenedMs: body.durationListenedMs ?? null,
    });
    return { ok: true as const };
  });

  // POST /v1/voice/feed/:recordingId/listened-full — telemetry
  app.post<{ Params: { recordingId: string } }>('/feed/:recordingId/listened-full', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    await feedRepo.recordEvent({ userId, recordingId: req.params.recordingId, action: 'listened_full' });
    // Increment listened_count on the recording (informational; eventually consistent)
    await db.execute(`UPDATE voice_recordings SET listened_count = listened_count + 1 WHERE id = '${req.params.recordingId}'::uuid` as never);
    return { ok: true as const };
  });

  // POST /v1/voice/feed/:recordingId/save
  app.post<{ Params: { recordingId: string } }>('/feed/:recordingId/save', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    await feedRepo.recordEvent({ userId, recordingId: req.params.recordingId, action: 'saved' });
    return { ok: true as const };
  });

  // POST /v1/voice/feed/:recordingId/reply — A replies to B's recording with audio
  // Mutual reply (A↔B) creates a chamber.
  app.post<{ Params: { recordingId: string } }>('/feed/:recordingId/reply', { preHandler: app.requireAuth }, async (req, reply) => {
    const fromUserId = req.auth!.userId;
    const body = parse(ReplyBody, req.body);
    const recordingId = req.params.recordingId;

    // 1. Validate parent recording exists and is active
    const [parent] = await db.select().from(voiceRecordings).where(eq(voiceRecordings.id, recordingId)).limit(1);
    if (!parent) throw new NotFoundError('voice.recording.not_found', 'Parent recording not found');
    if (parent.status !== 'active') throw new ConflictError('voice.recording.not_active', 'Parent recording is not active');
    if (parent.userId === fromUserId) throw new ValidationError('voice.reply.cannot_reply_to_self', 'Cannot reply to your own recording');

    // 2. Validate ownership of storage key
    if (!body.storageKey.startsWith(`voice/${fromUserId}/`)) {
      throw new ValidationError('voice.reply.storage_key_mismatch', 'storageKey does not belong to current user');
    }
    if (!(await storage.exists(body.storageKey))) {
      throw new ValidationError('voice.reply.upload_missing', 'No object found at provided storageKey');
    }

    const toUserId = parent.userId;

    // 3. Check if there's an existing pending reply from B (parent owner) → A (current user)
    //    If yes, that's a MATCH: create chamber + flip both replies' status.
    const existingFromOther = await repliesRepo.findOpenReplyBetween(toUserId, fromUserId);

    // 4. Create the reply row
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    const replyRow = await repliesRepo.create({
      fromUserId,
      toUserId,
      parentRecordingId: recordingId,
      storageKey: body.storageKey,
      contentType: body.contentType,
      durationSeconds: body.durationSeconds.toFixed(2),
      status: existingFromOther ? 'replied_back' : 'pending',
      expiresAt,
    });

    // 5. Track the feed event
    await feedRepo.recordEvent({ userId: fromUserId, recordingId, action: 'replied' });

    // 6. If mutual: create a chamber, mark both replies replied_back, drop initial system message
    let chamberId: string | undefined;
    if (existingFromOther) {
      const [ch] = await db
        .insert(chambers)
        .values({
          app: 'voice',
          origin: 'voice_match',
          originRefId: recordingId,
          status: 'active',
          lastMessageAt: new Date(),
        })
        .returning();
      if (!ch) throw new Error('chamber.create.failed');
      chamberId = ch.id;
      await db
        .insert(chamberParticipants)
        .values([
          { chamberId, userId: fromUserId },
          { chamberId, userId: toUserId },
        ]);
      await repliesRepo.markRepliedBack(replyRow.id, chamberId);
      await repliesRepo.markRepliedBack(existingFromOther.id, chamberId);

      // System welcome message
      await db.insert(messages).values({
        chamberId,
        senderId: null,
        kind: 'system',
        body: 'Hicieron match. Knot abre este canal — los próximos días son solo de voz.',
      });
      // Both reply audios become first messages
      await db.insert(messages).values([
        {
          chamberId,
          senderId: existingFromOther.fromUserId,
          kind: 'voice',
          voiceStorageKey: existingFromOther.storageKey,
          voiceContentType: existingFromOther.contentType,
          voiceDurationSeconds: existingFromOther.durationSeconds,
        },
        {
          chamberId,
          senderId: fromUserId,
          kind: 'voice',
          voiceStorageKey: body.storageKey,
          voiceContentType: body.contentType,
          voiceDurationSeconds: body.durationSeconds.toFixed(2),
        },
      ]);
    }

    // 7. Enqueue worker to process the reply audio (waveform + transcript) — async
    try {
      await getVoiceQueue().add('process-reply', {
        recordingId: replyRow.id,
        userId: fromUserId,
        storageKey: body.storageKey,
        contentType: body.contentType,
      });
    } catch (err) {
      req.log.error({ err }, 'voice.reply.enqueue.failed');
    }

    reply.code(201);
    return {
      id: replyRow.id,
      status: chamberId ? 'matched' : 'pending',
      chamberId: chamberId ?? null,
      expiresAt: replyRow.expiresAt.toISOString(),
    };
  });

  // GET /v1/voice/saved — list of recordings I've saved
  app.get('/saved', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const recs = await feedRepo.listSavedForUser(userId);
    return {
      recordings: recs.map((r) => ({
        id: r.id,
        promptText: r.promptTextSnapshot,
        durationSeconds: Number(r.durationSeconds),
        waveformPeaks: r.waveformPeaks,
      })),
    };
  });

  // GET /v1/voice/replies/received — pending replies sent to me
  app.get('/replies/received', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const list = await repliesRepo.listReceivedPending(userId);
    const out = await Promise.all(
      list.map(async (r) => {
        const signed = await storage.signDownload(r.storageKey);
        return {
          id: r.id,
          fromAnonymousId: 'ses_' + (Math.abs(hash(r.fromUserId + userId))).toString(16),
          parentRecordingId: r.parentRecordingId,
          audioUrl: signed.url,
          durationSeconds: Number(r.durationSeconds),
          createdAt: r.createdAt.toISOString(),
          expiresAt: r.expiresAt.toISOString(),
        };
      }),
    );
    return { replies: out };
  });
}

// Wire into voiceModule
export async function registerVoiceFeedRoutes(app: FastifyInstance) {
  await voiceFeedRoutes(app);
}
