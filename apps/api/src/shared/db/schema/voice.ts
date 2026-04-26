import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

export const voicePromptCategory = pgEnum('voice_prompt_category', ['mandatory', 'elective']);
export const voiceRecordingStatus = pgEnum('voice_recording_status', [
  'processing',
  'active',
  'rejected',
  'archived',
]);

export const voicePrompts = pgTable(
  'voice_prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    text: text('text').notNull(),
    locale: text('locale').notNull(),
    category: voicePromptCategory('category').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeIdx: index('idx_voice_prompts_active').on(t.locale, t.category, t.active),
  }),
);

export const voiceRecordings = pgTable(
  'voice_recordings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    promptId: uuid('prompt_id')
      .notNull()
      .references(() => voicePrompts.id),
    promptTextSnapshot: text('prompt_text_snapshot').notNull(),
    storageKey: text('storage_key').notNull(),
    contentType: text('content_type').notNull(),
    encryptionKeyId: text('encryption_key_id').notNull(),
    durationSeconds: numeric('duration_seconds', { precision: 4, scale: 2 }).notNull(),
    waveformPeaks: jsonb('waveform_peaks').notNull().default(sql`'[]'::jsonb`),
    transcript: text('transcript'),
    status: voiceRecordingStatus('status').notNull().default('processing'),
    rejectionReason: text('rejection_reason'),
    position: integer('position').notNull(),
    listenedCount: integer('listened_count').notNull().default(0),
    savedCount: integer('saved_count').notNull().default(0),
    replyCount: integer('reply_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userPosUq: unique('uq_voice_rec_user_pos').on(t.userId, t.position),
    activeUserIdx: index('idx_voice_rec_active_user').on(t.userId, t.status),
    durationCheck: check('voice_rec_duration_range', sql`${t.durationSeconds} BETWEEN 1 AND 30`),
    positionCheck: check('voice_rec_position_range', sql`${t.position} BETWEEN 1 AND 9`),
  }),
);

export type VoicePrompt = typeof voicePrompts.$inferSelect;
export type NewVoicePrompt = typeof voicePrompts.$inferInsert;
export type VoiceRecording = typeof voiceRecordings.$inferSelect;
export type NewVoiceRecording = typeof voiceRecordings.$inferInsert;
