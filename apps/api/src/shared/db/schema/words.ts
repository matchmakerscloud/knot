import { pgTable, uuid, text, integer, timestamp, boolean, pgEnum, index, unique, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

export const wordsResponseStatus = pgEnum('words_response_status', ['draft', 'pending_review', 'active', 'rejected', 'archived']);
export const wordsLikeStatus = pgEnum('words_like_status', ['pending', 'replied', 'expired', 'declined']);

export const wordsPrompts = pgTable(
  'words_prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    text: text('text').notNull(),
    category: text('category').notNull(),
    locale: text('locale').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ activeIdx: index('idx_words_prompts_active').on(t.locale, t.active) }),
);

export const wordsResponses = pgTable(
  'words_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    promptId: uuid('prompt_id').notNull().references(() => wordsPrompts.id),
    promptTextSnapshot: text('prompt_text_snapshot').notNull(),
    body: text('body').notNull(),
    position: integer('position').notNull(),
    status: wordsResponseStatus('status').notNull().default('pending_review'),
    rejectionReason: text('rejection_reason'),
    likeCount: integer('like_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userPos: unique('uq_words_resp_user_pos').on(t.userId, t.position),
    activeUser: index('idx_words_resp_active_user').on(t.userId, t.status),
    bodyLen: check('words_resp_body_length', sql`length(${t.body}) BETWEEN 100 AND 280`),
    posRange: check('words_resp_position_range', sql`${t.position} BETWEEN 1 AND 15`),
  }),
);

export const wordsLikes = pgTable(
  'words_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    likerId: uuid('liker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    likedUserId: uuid('liked_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    responseId: uuid('response_id').notNull().references(() => wordsResponses.id, { onDelete: 'cascade' }),
    comment: text('comment').notNull(),
    status: wordsLikeStatus('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    chamberId: uuid('chamber_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    likerLiked: unique('uq_words_likes_liker_liked').on(t.likerId, t.likedUserId),
    received: index('idx_words_likes_received').on(t.likedUserId, t.status, t.createdAt),
    commentLen: check('words_like_comment_length', sql`length(${t.comment}) >= 20`),
  }),
);

export type WordsPrompt = typeof wordsPrompts.$inferSelect;
export type NewWordsPrompt = typeof wordsPrompts.$inferInsert;
export type WordsResponse = typeof wordsResponses.$inferSelect;
export type NewWordsResponse = typeof wordsResponses.$inferInsert;
export type WordsLike = typeof wordsLikes.$inferSelect;
export type NewWordsLike = typeof wordsLikes.$inferInsert;
