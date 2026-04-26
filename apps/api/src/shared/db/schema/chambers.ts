import { pgTable, uuid, text, jsonb, boolean, timestamp, pgEnum, index, primaryKey, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

export const chamberApp = pgEnum('chamber_app', ['voice', 'words', 'match']);
export const chamberOrigin = pgEnum('chamber_origin', ['voice_match', 'words_match', 'match_presentation']);
export const chamberStatus = pgEnum('chamber_status', ['active', 'archived', 'closed']);

export const chambers = pgTable(
  'chambers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    app: chamberApp('app').notNull(),
    origin: chamberOrigin('origin').notNull(),
    originRefId: uuid('origin_ref_id'),
    status: chamberStatus('status').notNull().default('active'),
    photoUnlockState: jsonb('photo_unlock_state').notNull().default(sql`'{}'::jsonb`),
    textUnlockState: jsonb('text_unlock_state').notNull().default(sql`'{}'::jsonb`),
    aiObserverActive: boolean('ai_observer_active').notNull().default(false),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeIdx: index('idx_chambers_active').on(t.lastMessageAt),
  }),
);

export const chamberParticipants = pgTable(
  'chamber_participants',
  {
    chamberId: uuid('chamber_id').notNull().references(() => chambers.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp('left_at', { withTimezone: true }),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.chamberId, t.userId] }),
    userIdx: index('idx_chamber_part_user').on(t.userId),
  }),
);

export const messageKind = pgEnum('message_kind', ['voice', 'text', 'photo', 'system']);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chamberId: uuid('chamber_id').notNull().references(() => chambers.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id').references(() => users.id), // null for system messages
    kind: messageKind('kind').notNull(),
    body: text('body'), // text content
    voiceStorageKey: text('voice_storage_key'),
    voiceContentType: text('voice_content_type'),
    voiceDurationSeconds: numeric('voice_duration_seconds', { precision: 4, scale: 2 }),
    voiceWaveformPeaks: jsonb('voice_waveform_peaks'),
    voiceTranscript: text('voice_transcript'),
    photoStorageKey: text('photo_storage_key'),
    reactions: jsonb('reactions').notNull().default(sql`'[]'::jsonb`),
    readAtBy: jsonb('read_at_by').notNull().default(sql`'{}'::jsonb`),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    chamberIdx: index('idx_messages_chamber').on(t.chamberId, t.createdAt),
  }),
);

export type Chamber = typeof chambers.$inferSelect;
export type NewChamber = typeof chambers.$inferInsert;
export type ChamberParticipant = typeof chamberParticipants.$inferSelect;
export type NewChamberParticipant = typeof chamberParticipants.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
