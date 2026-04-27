import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { getStorage } from '../../shared/storage/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { photos } from '../../shared/db/schema/photos.js';
import { chambers, chamberParticipants } from '../../shared/db/schema/chambers.js';

const CreatePhoto = z.object({
  storageKey: z.string().min(8).max(512),
  contentType: z.string().min(3).max(80),
  position: z.number().int().min(1).max(6),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  blurHash: z.string().min(6).max(60).optional(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  try { return schema.parse(value); } catch (err) {
    if (err instanceof ZodError) throw new ValidationError('common.validation_failed', 'Invalid request', { issues: err.issues });
    throw err;
  }
}

export async function photosModule(app: FastifyInstance) {
  const storage = getStorage();

  // POST /v1/me/photos — register a previously-uploaded photo (uses /v1/uploads/photo/sign first)
  app.post('/', { preHandler: app.requireAuth }, async (req, reply) => {
    const userId = req.auth!.userId;
    const body = parse(CreatePhoto, req.body);
    if (!body.storageKey.startsWith(`photo/${userId}/`)) {
      throw new ValidationError('photo.storage_key_mismatch', 'storageKey does not belong to current user');
    }
    if (!(await storage.exists(body.storageKey))) {
      throw new ValidationError('photo.upload_missing', 'No object at storageKey');
    }
    const existing = await db.select().from(photos).where(and(eq(photos.userId, userId), eq(photos.position, body.position))).limit(1);
    if (existing.length > 0) throw new ConflictError('photo.position_in_use', `Position ${body.position} already taken`);

    const [row] = await db.insert(photos).values({
      userId,
      storageKey: body.storageKey,
      contentType: body.contentType,
      position: body.position,
      width: body.width ?? null,
      height: body.height ?? null,
      blurHash: body.blurHash ?? null,
    }).returning();
    if (!row) throw new Error('photo.insert.failed');
    reply.code(201);
    return { id: row.id, position: row.position, visibility: row.visibility };
  });

  // GET /v1/me/photos — list mine (NEVER returns others' photos here)
  app.get('/', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const rows = await db.select().from(photos).where(eq(photos.userId, userId)).orderBy(asc(photos.position));
    const out = await Promise.all(
      rows.map(async (p) => {
        const signed = await storage.signDownload(p.storageKey);
        return {
          id: p.id,
          position: p.position,
          visibility: p.visibility,
          width: p.width,
          height: p.height,
          blurHash: p.blurHash,
          url: signed.url,
        };
      }),
    );
    return { photos: out };
  });

  // DELETE /v1/me/photos/:id
  app.delete<{ Params: { id: string } }>('/:id', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const [row] = await db.select().from(photos).where(and(eq(photos.id, req.params.id), eq(photos.userId, userId))).limit(1);
    if (!row) throw new NotFoundError('photo.not_found', 'Photo not found');
    await storage.deleteObject(row.storageKey).catch(() => undefined);
    await db.delete(photos).where(eq(photos.id, row.id));
    return { ok: true as const };
  });
}

// Photo unlock within a chamber: both participants must accept
const UnlockRespondBody = z.object({ accept: z.boolean() });

export async function chamberPhotoUnlockRoutes(app: FastifyInstance) {
  const storage = getStorage();

  async function loadChamber(chamberId: string, userId: string) {
    const [ch] = await db.select().from(chambers).where(eq(chambers.id, chamberId)).limit(1);
    if (!ch) throw new NotFoundError('chamber.not_found', 'Chamber not found');
    const [part] = await db
      .select()
      .from(chamberParticipants)
      .where(and(eq(chamberParticipants.chamberId, chamberId), eq(chamberParticipants.userId, userId)))
      .limit(1);
    if (!part) throw new NotFoundError('chamber.not_found', 'Chamber not found');
    return ch;
  }

  // POST /v1/chambers/:id/photo-unlock/request
  app.post<{ Params: { id: string } }>('/:id/photo-unlock/request', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const ch = await loadChamber(req.params.id, userId);
    const state = (ch.photoUnlockState ?? {}) as Record<string, unknown>;
    state[`requested_by_${userId}`] = new Date().toISOString();
    await db.update(chambers).set({ photoUnlockState: state }).where(eq(chambers.id, ch.id));
    return { ok: true as const, state };
  });

  // POST /v1/chambers/:id/photo-unlock/respond { accept: boolean }
  app.post<{ Params: { id: string } }>('/:id/photo-unlock/respond', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const ch = await loadChamber(req.params.id, userId);
    const body = parse(UnlockRespondBody, req.body);
    const state = (ch.photoUnlockState ?? {}) as Record<string, unknown>;
    state[`accepted_by_${userId}`] = body.accept ? new Date().toISOString() : null;

    // Check mutual acceptance: both participants accepted (timestamp truthy)
    const [parts] = [await db.select().from(chamberParticipants).where(eq(chamberParticipants.chamberId, ch.id))];
    const allAccepted = parts.length === 2 && parts.every((p) => Boolean(state[`accepted_by_${p.userId}`]));
    if (allAccepted) state.unlocked_at = new Date().toISOString();

    await db.update(chambers).set({ photoUnlockState: state }).where(eq(chambers.id, ch.id));
    return { ok: true as const, state, unlocked: Boolean(state.unlocked_at) };
  });

  // GET /v1/chambers/:id/photos — only if unlocked, returns the OTHER participant's photos signed
  app.get<{ Params: { id: string } }>('/:id/photos', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const ch = await loadChamber(req.params.id, userId);
    const state = (ch.photoUnlockState ?? {}) as Record<string, unknown>;
    if (!state.unlocked_at) throw new ConflictError('photo.unlock.not_yet', 'Photos not yet unlocked in this chamber');

    const parts = await db.select().from(chamberParticipants).where(eq(chamberParticipants.chamberId, ch.id));
    const otherId = parts.find((p) => p.userId !== userId)?.userId;
    if (!otherId) return { photos: [] };
    const otherPhotos = await db.select().from(photos).where(eq(photos.userId, otherId)).orderBy(asc(photos.position));
    const out = await Promise.all(
      otherPhotos.map(async (p) => {
        const signed = await storage.signDownload(p.storageKey);
        return { id: p.id, position: p.position, blurHash: p.blurHash, url: signed.url };
      }),
    );
    return { photos: out };
  });
}
