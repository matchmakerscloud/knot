import { pgTable, uuid, text, integer, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const photoVisibility = pgEnum('photo_visibility', ['locked', 'unlocked_after_match', 'public']);

export const photos = pgTable(
  'photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    contentType: text('content_type').notNull(),
    position: integer('position').notNull(),
    visibility: photoVisibility('visibility').notNull().default('unlocked_after_match'),
    width: integer('width'),
    height: integer('height'),
    blurHash: text('blur_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userPos: unique('uq_photos_user_pos').on(t.userId, t.position) }),
);

export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
