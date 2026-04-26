import { pgTable, uuid, text, integer, timestamp, pgEnum, index, bigserial, numeric } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { voiceRecordings } from './voice.js';

export const voiceFeedAction = pgEnum('voice_feed_action', [
  'viewed',
  'listened_partial',
  'listened_full',
  'saved',
  'replied',
  'skipped',
]);

export const voiceFeedEvents = pgTable(
  'voice_feed_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => voiceRecordings.id, { onDelete: 'cascade' }),
    action: voiceFeedAction('action').notNull(),
    durationListenedMs: integer('duration_listened_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userRecentIdx: index('idx_vfe_user_recent').on(t.userId, t.createdAt),
    recordingIdx: index('idx_vfe_recording').on(t.recordingId),
  }),
);

export type VoiceFeedEvent = typeof voiceFeedEvents.$inferSelect;
export type NewVoiceFeedEvent = typeof voiceFeedEvents.$inferInsert;

// =============================================================================
// voice_replies — per spec §3.2: A replies to B's recording with audio.
//                 Mutual reply (A→B AND B→A) = match → opens a chamber.
// =============================================================================
export const voiceReplyStatus = pgEnum('voice_reply_status', [
  'pending',       // waiting for the recipient to listen + respond
  'replied_back',  // mutual; chamber created
  'expired',       // 14 days passed, recipient never engaged
  'declined',      // recipient explicitly skipped
]);

export const voiceReplies = pgTable(
  'voice_replies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUserId: uuid('from_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    toUserId: uuid('to_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    parentRecordingId: uuid('parent_recording_id')
      .notNull()
      .references(() => voiceRecordings.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    contentType: text('content_type').notNull(),
    durationSeconds: numeric('duration_seconds', { precision: 4, scale: 2 }).notNull(),
    transcript: text('transcript'),
    status: voiceReplyStatus('status').notNull().default('pending'),
    chamberId: uuid('chamber_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    toIdx: index('idx_voice_replies_to_status').on(t.toUserId, t.status, t.createdAt),
    fromIdx: index('idx_voice_replies_from').on(t.fromUserId, t.createdAt),
  }),
);

export type VoiceReply = typeof voiceReplies.$inferSelect;
export type NewVoiceReply = typeof voiceReplies.$inferInsert;
