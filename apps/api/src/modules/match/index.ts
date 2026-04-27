import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { matchProfiles, matchPresentations } from '../../shared/db/schema/match.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { buildSemanticProfile, createPresentation } from './service.js';

const FeedbackBody = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});
const DeclineBody = z.object({ reason: z.string().max(500).optional() });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  try { return schema.parse(value); } catch (err) {
    if (err instanceof ZodError) throw new ValidationError('common.validation_failed', 'Invalid request', { issues: err.issues });
    throw err;
  }
}

export async function matchModule(app: FastifyInstance) {
  // POST /v1/match/onboarding/start — initialize match_profiles row, link to Knot conversations
  app.post('/onboarding/start', { preHandler: app.requireAuth }, async (req, reply) => {
    const userId = req.auth!.userId;
    const existing = await db.select().from(matchProfiles).where(eq(matchProfiles.userId, userId)).limit(1);
    if (existing.length === 0) {
      await db.insert(matchProfiles).values({
        userId,
        onboardingStatus: 'in_progress',
        onboardingStartedAt: new Date(),
      });
    } else if (existing[0]!.onboardingStatus === 'not_started') {
      await db.update(matchProfiles).set({
        onboardingStatus: 'in_progress',
        onboardingStartedAt: new Date(),
      }).where(eq(matchProfiles.userId, userId));
    }
    reply.code(201);
    return { ok: true as const, status: 'in_progress' };
  });

  // GET /v1/match/onboarding/state
  app.get('/onboarding/state', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const [row] = await db.select().from(matchProfiles).where(eq(matchProfiles.userId, userId)).limit(1);
    if (!row) return { status: 'not_started', currentDay: 0, totalDays: 7 };
    // Count match_onboarding conversations as proxy for currentDay
    return {
      status: row.onboardingStatus,
      onboardingStartedAt: row.onboardingStartedAt?.toISOString() ?? null,
      onboardingCompletedAt: row.onboardingCompletedAt?.toISOString() ?? null,
    };
  });

  // POST /v1/match/profile/build — generate semantic profile from Knot conversations (idempotent)
  app.post('/profile/build', { preHandler: app.requireAuth }, async (req, reply) => {
    const userId = req.auth!.userId;
    const profile = await buildSemanticProfile(userId);
    reply.code(201);
    return {
      status: profile.onboardingStatus,
      publicNarrative: profile.publicNarrative,
      valuesJson: profile.valuesJson,
    };
  });

  // GET /v1/match/profile — my profile
  app.get('/profile', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const [row] = await db.select().from(matchProfiles).where(eq(matchProfiles.userId, userId)).limit(1);
    if (!row) throw new NotFoundError('match.profile.not_found', 'Profile not built yet');
    return {
      status: row.onboardingStatus,
      publicNarrative: row.publicNarrative,
      valuesJson: row.valuesJson,
      onboardingCompletedAt: row.onboardingCompletedAt?.toISOString() ?? null,
    };
  });

  // GET /v1/match/today — current presentation if any
  app.get('/today', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const [pres] = await db
      .select()
      .from(matchPresentations)
      .where(and(eq(matchPresentations.presentedToId, userId), eq(matchPresentations.status, 'queued')))
      .orderBy(desc(matchPresentations.createdAt))
      .limit(1);
    if (!pres) return { status: 'no_presentation' as const };
    // Mark as shown (idempotent first-shown timestamp)
    await db.update(matchPresentations).set({ shownAt: pres.shownAt ?? new Date(), status: 'shown' }).where(eq(matchPresentations.id, pres.id));
    return {
      status: 'presentation_available' as const,
      presentation: {
        id: pres.id,
        dossier: {
          summary: pres.dossierSummary,
          commonGround: pres.dossierCommonGround,
          generativeDifference: pres.dossierGenerativeDifference,
        },
        conversationStarters: pres.conversationStarters,
      },
    };
  });

  // POST /v1/match/presentations/:id/accept
  app.post<{ Params: { id: string } }>('/presentations/:id/accept', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const [pres] = await db.select().from(matchPresentations).where(eq(matchPresentations.id, req.params.id)).limit(1);
    if (!pres || pres.presentedToId !== userId) throw new NotFoundError('match.presentation.not_found', 'Presentation not found');
    if (pres.status === 'expired' || pres.status === 'declined') throw new ConflictError('match.presentation.closed', 'This presentation is no longer open');
    await db.update(matchPresentations).set({
      status: 'accepted',
      userDecisionAt: new Date(),
    }).where(eq(matchPresentations.id, pres.id));
    // Future Plan #13b: open chamber when BOTH sides have accepted
    return { ok: true as const };
  });

  // POST /v1/match/presentations/:id/decline
  app.post<{ Params: { id: string } }>('/presentations/:id/decline', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const body = req.body ? parse(DeclineBody, req.body) : {};
    const [pres] = await db.select().from(matchPresentations).where(eq(matchPresentations.id, req.params.id)).limit(1);
    if (!pres || pres.presentedToId !== userId) throw new NotFoundError('match.presentation.not_found', 'Presentation not found');
    await db.update(matchPresentations).set({
      status: 'declined',
      userDecisionAt: new Date(),
      feedbackComment: body.reason ?? null,
    }).where(eq(matchPresentations.id, pres.id));
    return { ok: true as const };
  });

  // POST /v1/match/presentations/:id/feedback (1-5 + optional comment)
  app.post<{ Params: { id: string } }>('/presentations/:id/feedback', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const body = parse(FeedbackBody, req.body);
    const [pres] = await db.select().from(matchPresentations).where(eq(matchPresentations.id, req.params.id)).limit(1);
    if (!pres || pres.presentedToId !== userId) throw new NotFoundError('match.presentation.not_found', 'Presentation not found');
    await db.update(matchPresentations).set({
      feedbackScore: body.score,
      feedbackComment: body.comment ?? null,
    }).where(eq(matchPresentations.id, pres.id));
    return { ok: true as const };
  });

  // POST /v1/match/admin/test-presentation — DEV ONLY: generate a dossier between two arbitrary users
  // (will be moved behind admin role + IP allowlist when admin auth is built)
  app.post('/admin/test-presentation', { preHandler: app.requireAuth }, async (req, reply) => {
    const Body = z.object({ presentedToId: z.string().uuid(), presentedUserId: z.string().uuid() });
    const body = parse(Body, req.body);
    const row = await createPresentation(body.presentedToId, body.presentedUserId);
    reply.code(201);
    return {
      id: row.id,
      status: row.status,
      dossier: {
        summary: row.dossierSummary,
        commonGround: row.dossierCommonGround,
        generativeDifference: row.dossierGenerativeDifference,
      },
      conversationStarters: row.conversationStarters,
    };
  });
}
