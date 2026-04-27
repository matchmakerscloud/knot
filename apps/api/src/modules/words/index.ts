import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { and, asc, desc, eq, ne, notInArray, sql } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { wordsPrompts, wordsResponses, wordsLikes } from '../../shared/db/schema/words.js';
import { users } from '../../shared/db/schema/users.js';
import { chambers, chamberParticipants, messages } from '../../shared/db/schema/chambers.js';

const ListPromptsQ = z.object({ locale: z.enum(['es', 'en', 'pt-BR']).default('es'), category: z.string().optional() });
const CreateResponse = z.object({
  promptId: z.string().uuid(),
  body: z.string().min(100).max(280),
  position: z.number().int().min(1).max(15),
});
const LikeBody = z.object({
  responseId: z.string().uuid(),
  comment: z.string().min(20).max(500),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  try { return schema.parse(value); } catch (err) {
    if (err instanceof ZodError) throw new ValidationError('common.validation_failed', 'Invalid request', { issues: err.issues });
    throw err;
  }
}

function ageBucket(dob: string): string {
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  const decade = Math.floor(age / 10) * 10;
  return age - decade < 5 ? `${decade}s_tempranos` : `${decade}s_tardíos`;
}

export async function wordsModule(app: FastifyInstance) {
  // GET /v1/words/prompts/available
  app.get('/prompts/available', { preHandler: app.requireAuth }, async (req) => {
    const q = parse(ListPromptsQ, req.query);
    const where = q.category
      ? and(eq(wordsPrompts.locale, q.locale ?? 'es'), eq(wordsPrompts.category, q.category), eq(wordsPrompts.active, true))
      : and(eq(wordsPrompts.locale, q.locale ?? 'es'), eq(wordsPrompts.active, true));
    const list = await db.select().from(wordsPrompts).where(where).orderBy(asc(wordsPrompts.text));
    return { prompts: list.map((p) => ({ id: p.id, text: p.text, category: p.category, locale: p.locale })) };
  });

  // POST /v1/words/responses
  app.post('/responses', { preHandler: app.requireAuth }, async (req, reply) => {
    const userId = req.auth!.userId;
    const body = parse(CreateResponse, req.body);

    const [prompt] = await db.select().from(wordsPrompts).where(eq(wordsPrompts.id, body.promptId)).limit(1);
    if (!prompt || !prompt.active) throw new NotFoundError('words.prompt.not_found', 'Prompt not found or inactive');

    const ex = await db.select().from(wordsResponses).where(and(eq(wordsResponses.userId, userId), eq(wordsResponses.position, body.position))).limit(1);
    if (ex.length > 0) throw new ConflictError('words.position_in_use', `Position ${body.position} already taken`);

    const [row] = await db.insert(wordsResponses).values({
      userId,
      promptId: body.promptId,
      promptTextSnapshot: prompt.text,
      body: body.body,
      position: body.position,
      // Auto-active for MVP; future: pending_review with moderation classifier
      status: 'active',
    }).returning();
    if (!row) throw new Error('words.response.insert.failed');

    reply.code(201);
    return { id: row.id, status: row.status };
  });

  // GET /v1/words/responses (mine)
  app.get('/responses', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const rows = await db.select().from(wordsResponses).where(eq(wordsResponses.userId, userId)).orderBy(asc(wordsResponses.position));
    return {
      responses: rows.map((r) => ({
        id: r.id,
        promptText: r.promptTextSnapshot,
        body: r.body,
        position: r.position,
        status: r.status,
        likeCount: r.likeCount,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });

  // GET /v1/words/feed — list of OTHER people's responses (cursor-light: just paginate by id)
  app.get('/feed', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    // Exclude responses to which I already replied with a like
    const liked = await db.select({ rid: wordsLikes.responseId }).from(wordsLikes).where(eq(wordsLikes.likerId, userId));
    const excludedIds = liked.map((l) => l.rid);

    const list = await db
      .select({ resp: wordsResponses, user: users })
      .from(wordsResponses)
      .innerJoin(users, eq(users.id, wordsResponses.userId))
      .where(
        and(
          eq(wordsResponses.status, 'active'),
          ne(wordsResponses.userId, userId),
          excludedIds.length > 0 ? notInArray(wordsResponses.id, excludedIds) : undefined,
        ),
      )
      .orderBy(desc(wordsResponses.createdAt))
      .limit(20);

    return {
      items: list.map((row) => ({
        responseId: row.resp.id,
        promptText: row.resp.promptTextSnapshot,
        body: row.resp.body,
        user: {
          firstName: row.user.firstName,
          ageBucket: ageBucket(row.user.dateOfBirth),
          anonymousId: 'ses_' + Math.abs(hash(row.resp.userId + userId)).toString(16),
        },
        createdAt: row.resp.createdAt.toISOString(),
      })),
      nextCursor: null,
    };
  });

  // POST /v1/words/likes — like-with-comment
  app.post('/likes', { preHandler: app.requireAuth }, async (req, reply) => {
    const likerId = req.auth!.userId;
    const body = parse(LikeBody, req.body);

    const [resp] = await db.select().from(wordsResponses).where(eq(wordsResponses.id, body.responseId)).limit(1);
    if (!resp || resp.status !== 'active') throw new NotFoundError('words.response.not_found', 'Response not found');
    if (resp.userId === likerId) throw new ValidationError('words.like.cannot_like_self', 'Cannot like your own response');

    // Check existing like (likerId+likedUserId unique)
    const existing = await db.select().from(wordsLikes).where(and(eq(wordsLikes.likerId, likerId), eq(wordsLikes.likedUserId, resp.userId))).limit(1);
    if (existing.length > 0) throw new ConflictError('words.like.already_exists', 'You already liked this person');

    // Check the inverse: did the other already like one of MY responses?
    const inverse = await db
      .select()
      .from(wordsLikes)
      .where(and(eq(wordsLikes.likerId, resp.userId), eq(wordsLikes.likedUserId, likerId), eq(wordsLikes.status, 'pending')))
      .limit(1);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    let chamberId: string | undefined;

    const [row] = await db.insert(wordsLikes).values({
      likerId,
      likedUserId: resp.userId,
      responseId: body.responseId,
      comment: body.comment,
      status: inverse.length > 0 ? 'replied' : 'pending',
      expiresAt,
    }).returning();
    if (!row) throw new Error('words.like.insert.failed');

    // Bump like_count on the response (informational)
    await db.update(wordsResponses).set({ likeCount: sql`${wordsResponses.likeCount} + 1` }).where(eq(wordsResponses.id, body.responseId));

    if (inverse.length > 0) {
      // MUTUAL → chamber
      const [ch] = await db.insert(chambers).values({
        app: 'words',
        origin: 'words_match',
        originRefId: body.responseId,
        status: 'active',
        lastMessageAt: new Date(),
      }).returning();
      if (!ch) throw new Error('chamber.create.failed');
      chamberId = ch.id;

      await db.insert(chamberParticipants).values([
        { chamberId, userId: likerId },
        { chamberId, userId: resp.userId },
      ]);

      await db.update(wordsLikes).set({ status: 'replied', chamberId, respondedAt: new Date() }).where(eq(wordsLikes.id, row.id));
      await db.update(wordsLikes).set({ status: 'replied', chamberId, respondedAt: new Date() }).where(eq(wordsLikes.id, inverse[0]!.id));

      await db.insert(messages).values({
        chamberId,
        senderId: null,
        kind: 'system',
        body: 'Hicieron match en Words. Solo texto los primeros 4 días — después se desbloquean fotos.',
      });
      // Add the two original comments as first messages
      await db.insert(messages).values([
        { chamberId, senderId: inverse[0]!.likerId, kind: 'text', body: inverse[0]!.comment },
        { chamberId, senderId: likerId, kind: 'text', body: body.comment },
      ]);
    }

    reply.code(201);
    return { id: row.id, status: row.status, chamberId: chamberId ?? null, expiresAt: row.expiresAt.toISOString() };
  });

  // GET /v1/words/likes/received — pending likes addressed to me
  app.get('/likes/received', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const rows = await db
      .select({ like: wordsLikes, response: wordsResponses })
      .from(wordsLikes)
      .innerJoin(wordsResponses, eq(wordsResponses.id, wordsLikes.responseId))
      .where(and(eq(wordsLikes.likedUserId, userId), eq(wordsLikes.status, 'pending')))
      .orderBy(desc(wordsLikes.createdAt));
    return {
      likes: rows.map((r) => ({
        id: r.like.id,
        comment: r.like.comment,
        responsePromptText: r.response.promptTextSnapshot,
        responseBody: r.response.body,
        fromAnonymousId: 'ses_' + Math.abs(hash(r.like.likerId + userId)).toString(16),
        createdAt: r.like.createdAt.toISOString(),
        expiresAt: r.like.expiresAt.toISOString(),
      })),
    };
  });
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
