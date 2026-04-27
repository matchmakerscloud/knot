import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { reports, blocks } from '../../shared/db/schema/safety.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';

const ReportBody = z.object({
  targetKind: z.enum(['user', 'voice_recording', 'words_response', 'message', 'photo']),
  targetId: z.string().uuid(),
  reason: z.enum(['spam', 'harassment', 'inappropriate_content', 'catfish', 'underage', 'other']),
  details: z.string().max(2000).optional(),
});

const BlockBody = z.object({
  userId: z.string().uuid(),
  reason: z.string().max(2000).optional(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  try { return schema.parse(value); } catch (err) {
    if (err instanceof ZodError) throw new ValidationError('common.validation_failed', 'Invalid request', { issues: err.issues });
    throw err;
  }
}

export async function safetyModule(app: FastifyInstance) {
  // POST /v1/reports
  app.post('/reports', { preHandler: app.requireAuth }, async (req, reply) => {
    const reporterId = req.auth!.userId;
    const body = parse(ReportBody, req.body);
    const [row] = await db.insert(reports).values({
      reporterId,
      targetKind: body.targetKind,
      targetId: body.targetId,
      reason: body.reason,
      details: body.details ?? null,
      status: 'pending',
    }).returning();
    if (!row) throw new Error('report.insert.failed');
    reply.code(201);
    return { id: row.id, status: row.status };
  });

  // POST /v1/blocks
  app.post('/blocks', { preHandler: app.requireAuth }, async (req, reply) => {
    const blockerId = req.auth!.userId;
    const body = parse(BlockBody, req.body);
    if (body.userId === blockerId) throw new ValidationError('blocks.cannot_block_self', 'Cannot block yourself');
    try {
      await db.insert(blocks).values({
        blockerId,
        blockedId: body.userId,
        reason: body.reason ?? null,
      });
    } catch (err) {
      // unique violation = already blocked, return idempotent
      const code = (err as { code?: string }).code;
      if (code !== '23505') throw err;
    }
    reply.code(201);
    return { ok: true as const };
  });

  // DELETE /v1/blocks/:userId — unblock
  app.delete<{ Params: { userId: string } }>('/blocks/:userId', { preHandler: app.requireAuth }, async (req) => {
    const blockerId = req.auth!.userId;
    const result = await db.delete(blocks).where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, req.params.userId)));
    return { ok: true as const, deleted: result.length };
  });

  // GET /v1/blocks
  app.get('/blocks', { preHandler: app.requireAuth }, async (req) => {
    const blockerId = req.auth!.userId;
    const rows = await db.select().from(blocks).where(eq(blocks.blockerId, blockerId));
    return {
      blocks: rows.map((b) => ({ blockedUserId: b.blockedId, reason: b.reason, createdAt: b.createdAt.toISOString() })),
    };
  });
}
