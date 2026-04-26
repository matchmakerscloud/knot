import { pgTable, uuid, jsonb, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { voiceRecordings } from './voice.js';

/**
 * Per-user voice fingerprints used for anti-catfish verification.
 *
 * Embedding storage choice: JSONB instead of pgvector here because Resemblyzer
 * embeddings are 256-d (not 192 like the original pyannote spec). When/if we
 * migrate to pyannote, we'll change to vector(192) — but for now JSONB is
 * fine: we only do per-user lookups, no nearest-neighbor search across users.
 */
export const voiceFingerprints = pgTable(
  'voice_fingerprints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    embedding: jsonb('embedding').notNull(),
    embeddingDim: integer('embedding_dim').notNull(),
    model: integer('model'), // unused; placeholder if we ever multiplex models
    sourceRecordingId: uuid('source_recording_id').references(() => voiceRecordings.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('idx_voice_fp_user').on(t.userId),
  }),
);

export type VoiceFingerprint = typeof voiceFingerprints.$inferSelect;
export type NewVoiceFingerprint = typeof voiceFingerprints.$inferInsert;
