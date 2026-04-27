import type { FastifyInstance } from 'fastify';
import { z, ZodError } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../shared/db/client.js';
import { userPreferences } from '../../shared/db/schema/user-preferences.js';
import { ValidationError } from '../../shared/errors.js';

const PrefsBody = z.object({
  interestedIn: z.array(z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say', 'other'])).min(1).max(5),
  ageMin: z.number().int().min(18).max(99),
  ageMax: z.number().int().min(18).max(99),
  maxDistanceKm: z.number().int().min(1).max(20000).optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    city: z.string().max(100).optional(),
    country: z.string().max(2).optional(),
  }).optional(),
});

function parse<T>(s: z.ZodType<T>, v: unknown): T {
  try { return s.parse(v); }
  catch (e) {
    if (e instanceof ZodError) throw new ValidationError('common.validation_failed', 'Invalid request', { issues: e.issues });
    throw e;
  }
}

export async function preferencesRoutes(app: FastifyInstance) {
  app.get('/preferences', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const [row] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    if (!row) {
      return {
        preferences: {
          interestedIn: [],
          ageMin: 18,
          ageMax: 99,
          maxDistanceKm: null,
          location: null,
        },
      };
    }
    return {
      preferences: {
        interestedIn: row.interestedIn,
        ageMin: row.ageMin,
        ageMax: row.ageMax,
        maxDistanceKm: row.maxDistanceKm,
        location: row.locationLat !== null && row.locationLng !== null
          ? { lat: row.locationLat, lng: row.locationLng, city: row.locationCity, country: row.locationCountry }
          : null,
      },
    };
  });

  app.put('/preferences', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const body = parse(PrefsBody, req.body);
    if (body.ageMax < body.ageMin) {
      throw new ValidationError('preferences.age_range', 'ageMax must be >= ageMin');
    }
    const values = {
      userId,
      interestedIn: body.interestedIn,
      ageMin: body.ageMin,
      ageMax: body.ageMax,
      maxDistanceKm: body.maxDistanceKm ?? null,
      locationLat: body.location?.lat ?? null,
      locationLng: body.location?.lng ?? null,
      locationCity: body.location?.city ?? null,
      locationCountry: body.location?.country ?? null,
      updatedAt: new Date(),
    };
    const existing = await db.select({ id: userPreferences.userId }).from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    if (existing.length > 0) {
      await db.update(userPreferences).set(values).where(eq(userPreferences.userId, userId));
    } else {
      await db.insert(userPreferences).values(values);
    }
    return { ok: true as const };
  });
}
