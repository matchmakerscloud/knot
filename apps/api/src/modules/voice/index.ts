import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { db } from '../../shared/db/client.js';
import { getStorage } from '../../shared/storage/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { VoicePromptsRepository, VoiceRecordingsRepository } from './repository.js';

const ListPromptsQuery = z.object({
  locale: z.enum(['es', 'en', 'pt-BR']).default('es'),
  category: z.enum(['mandatory', 'elective']).optional(),
});

const CreateRecordingBody = z.object({
  promptId: z.string().uuid(),
  position: z.number().int().min(1).max(9),
  storageKey: z.string().min(8).max(512),
  contentType: z.string().min(3).max(80),
  durationSeconds: z.number().min(1).max(30),
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

export async function voiceModule(app: FastifyInstance) {
  const prompts = new VoicePromptsRepository(db);
  const recordings = new VoiceRecordingsRepository(db);
  const storage = getStorage();

  // GET /v1/voice/prompts/available?locale=&category=
  app.get('/prompts/available', { preHandler: app.requireAuth }, async (req) => {
    const q = parse(ListPromptsQuery, req.query);
    const list = await prompts.listAvailable({
      locale: q.locale ?? 'es',
      ...(q.category ? { category: q.category } : {}),
    });
    return { prompts: list.map((p) => ({ id: p.id, text: p.text, category: p.category, locale: p.locale })) };
  });

  // POST /v1/voice/recordings
  // Called after the client has uploaded the file to the presigned PUT URL.
  app.post('/recordings', { preHandler: app.requireAuth }, async (req, reply) => {
    const userId = req.auth!.userId;
    const body = parse(CreateRecordingBody, req.body);

    // Validate that the storage key actually belongs to this user.
    // Pattern: voice/<userId>/<resourceId>/<uuid>.<ext>
    const expectedPrefix = `voice/${userId}/`;
    if (!body.storageKey.startsWith(expectedPrefix)) {
      throw new ValidationError('voice.recording.storage_key_mismatch', 'storageKey does not belong to current user');
    }

    // Validate the prompt exists and is active.
    const prompt = await prompts.findById(body.promptId);
    if (!prompt || !prompt.active) {
      throw new NotFoundError('voice.prompt.not_found', 'Prompt not found or inactive');
    }

    // Position uniqueness per user.
    const existing = await recordings.findByUserAndPosition(userId, body.position);
    if (existing) {
      throw new ConflictError('voice.position_in_use', `Position ${body.position} is already taken`);
    }

    // Verify object actually exists in storage (defends against client lying or aborted upload).
    const exists = await storage.exists(body.storageKey);
    if (!exists) {
      throw new ValidationError('voice.recording.upload_missing', 'No object found at provided storageKey');
    }

    const row = await recordings.create({
      userId,
      promptId: body.promptId,
      promptTextSnapshot: prompt.text,
      storageKey: body.storageKey,
      contentType: body.contentType,
      // TODO Plan #7: real per-content AES-256-GCM key + KMS-wrapped storage.
      encryptionKeyId: 'plaintext-v0',
      durationSeconds: body.durationSeconds.toFixed(2),
      position: body.position,
      status: 'processing',
    });

    reply.code(202);
    return {
      id: row.id,
      status: row.status,
      estimatedReadyInSeconds: 5,
    };
  });

  // GET /v1/voice/recordings/:id
  app.get<{ Params: { id: string } }>('/recordings/:id', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const row = await recordings.findById(req.params.id);
    if (!row) throw new NotFoundError('voice.recording.not_found', 'Recording not found');
    if (row.userId !== userId) throw new NotFoundError('voice.recording.not_found', 'Recording not found');

    const out: Record<string, unknown> = {
      id: row.id,
      promptText: row.promptTextSnapshot,
      durationSeconds: Number(row.durationSeconds),
      status: row.status,
      waveformPeaks: row.waveformPeaks,
      transcript: row.transcript,
      position: row.position,
      stats: {
        listened: row.listenedCount,
        saved: row.savedCount,
        replied: row.replyCount,
      },
      createdAt: row.createdAt.toISOString(),
    };

    // Sign download URL only when the recording is active (post-processing).
    if (row.status === 'active') {
      const signed = await storage.signDownload(row.storageKey);
      out.audioUrl = signed.url;
    }

    return out;
  });

  // GET /v1/voice/recordings — list mine
  app.get('/recordings', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const rows = await recordings.listByUser(userId);
    return {
      recordings: rows.map((r) => ({
        id: r.id,
        promptText: r.promptTextSnapshot,
        position: r.position,
        durationSeconds: Number(r.durationSeconds),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });

  // DELETE /v1/voice/recordings/:id — archive
  app.delete<{ Params: { id: string } }>('/recordings/:id', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const row = await recordings.findById(req.params.id);
    if (!row || row.userId !== userId) {
      throw new NotFoundError('voice.recording.not_found', 'Recording not found');
    }
    await recordings.archive(row.id);
    return { ok: true as const };
  });
}
