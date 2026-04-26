import { pgTable, uuid, text, timestamp, date, pgEnum, index } from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', [
  'pending_verification',
  'active',
  'suspended',
  'deleted',
]);

export const gender = pgEnum('gender', [
  'male',
  'female',
  'non_binary',
  'prefer_not_to_say',
  'other',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    phone: text('phone').unique(),
    passwordHash: text('password_hash').notNull(),
    firstName: text('first_name').notNull(),
    dateOfBirth: date('date_of_birth').notNull(),
    gender: gender('gender').notNull(),
    genderOtherLabel: text('gender_other_label'),
    status: userStatus('status').notNull().default('pending_verification'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
    identityVerifiedAt: timestamp('identity_verified_at', { withTimezone: true }),
    locale: text('locale').notNull().default('es'),
    timezone: text('timezone').notNull().default('UTC'),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index('idx_users_status').on(t.status),
    lastActiveIdx: index('idx_users_last_active').on(t.lastActiveAt),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
