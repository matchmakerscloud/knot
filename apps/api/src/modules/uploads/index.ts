import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { getStorage } from '../../shared/storage/index.js';
import { ValidationError } from '../../shared/errors.js';

const SignAudioSchema = z.object({
  contentType: z.string().min(3).max(80),
  extension: z.string().min(1).max(8).default('webm'),
  contentLength: z.number().int().positive().max(15 * 1024 * 1024).optional(),
});

const SignPhotoSchema = z.object({
  contentType: z.string().min(3).max(80),
  extension: z.string().min(1).max(8).default('jpg'),
  contentLength: z.number().int().positive().max(10 * 1024 * 1024).optional(),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ValidationError('common.validation_failed', 'Invalid request', { issues: err.issues });
    }
    throw err;
  }
}

export async function uploadsModule(app: FastifyInstance) {
  const storage = getStorage();

  // POST /v1/uploads/audio/sign — get a presigned PUT URL for direct browser audio upload
  app.post('/audio/sign', { preHandler: app.requireAuth }, async (req) => {
    const body = parse(SignAudioSchema, req.body);
    const userId = req.auth!.userId;
    const resourceId = randomUUID();
    try {
      const out = await storage.signUpload({
        namespace: 'voice',
        ownerId: userId,
        resourceId,
        extension: body.extension ?? 'webm',
        contentType: body.contentType,
        ...(body.contentLength ? { contentLength: body.contentLength } : {}),
      });
      return { resourceId, ...out };
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.startsWith('storage.audio.unsupported_content_type')) {
        throw new ValidationError('upload.audio.unsupported_content_type', msg, { contentType: body.contentType });
      }
      throw err;
    }
  });

  // POST /v1/uploads/photo/sign — get a presigned PUT URL for direct browser photo upload
  app.post('/photo/sign', { preHandler: app.requireAuth }, async (req) => {
    const body = parse(SignPhotoSchema, req.body);
    const userId = req.auth!.userId;
    const resourceId = randomUUID();
    try {
      const out = await storage.signUpload({
        namespace: 'photo',
        ownerId: userId,
        resourceId,
        extension: body.extension ?? 'jpg',
        contentType: body.contentType,
        ...(body.contentLength ? { contentLength: body.contentLength } : {}),
      });
      return { resourceId, ...out };
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.startsWith('storage.image.unsupported_content_type')) {
        throw new ValidationError('upload.photo.unsupported_content_type', msg, { contentType: body.contentType });
      }
      throw err;
    }
  });
}
