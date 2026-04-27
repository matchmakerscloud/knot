import { pgTable, uuid, text, integer, doublePrecision, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users, gender } from './users.js';

export const userApps = pgTable('user_apps', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  app: text('app').notNull(),
  enabledAt: timestamp('enabled_at', { withTimezone: true }).notNull().defaultNow(),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
});

export const userPreferences = pgTable(
  'user_preferences',
  {
    userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    interestedIn: text('interested_in').array().notNull(),
    ageMin: integer('age_min').notNull().default(18),
    ageMax: integer('age_max').notNull().default(99),
    maxDistanceKm: integer('max_distance_km'),
    locationCity: text('location_city'),
    locationCountry: text('location_country'),
    locationLat: doublePrecision('location_lat'),
    locationLng: doublePrecision('location_lng'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;

void gender; // re-export silencer
