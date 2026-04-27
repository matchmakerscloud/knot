import { pgTable, uuid, text, integer, jsonb, numeric, timestamp, pgEnum, index, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

export const matchOnboardingStatus = pgEnum('match_onboarding_status', ['not_started', 'in_progress', 'awaiting_review', 'complete']);
export const matchPresentationStatus = pgEnum('match_presentation_status', ['pending_review', 'queued', 'shown', 'accepted', 'declined', 'expired']);

export const matchProfiles = pgTable(
  'match_profiles',
  {
    userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    onboardingStatus: matchOnboardingStatus('onboarding_status').notNull().default('not_started'),
    onboardingStartedAt: timestamp('onboarding_started_at', { withTimezone: true }),
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    semanticSummary: text('semantic_summary'),
    valuesJson: jsonb('values_json'),
    preferencesNarrative: text('preferences_narrative'),
    publicNarrative: text('public_narrative'),
    // Embeddings stored as JSONB until we know which dim to commit to schema-wise.
    embedding: jsonb('embedding'),
    fitVector: jsonb('fit_vector'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

export const matchPresentations = pgTable(
  'match_presentations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    presentedToId: uuid('presented_to_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    presentedUserId: uuid('presented_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    dossierSummary: text('dossier_summary').notNull(),
    dossierCommonGround: text('dossier_common_ground').notNull(),
    dossierGenerativeDifference: text('dossier_generative_difference').notNull(),
    conversationStarters: jsonb('conversation_starters').notNull(),
    compatibilityScore: numeric('compatibility_score', { precision: 4, scale: 3 }),
    status: matchPresentationStatus('status').notNull().default('pending_review'),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    shownAt: timestamp('shown_at', { withTimezone: true }),
    userDecisionAt: timestamp('user_decision_at', { withTimezone: true }),
    feedbackScore: integer('feedback_score'),
    feedbackComment: text('feedback_comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pairUq: unique('uq_match_pres_pair').on(t.presentedToId, t.presentedUserId),
    toIdx: index('idx_match_pres_to').on(t.presentedToId, t.status),
  }),
);

export type MatchProfile = typeof matchProfiles.$inferSelect;
export type NewMatchProfile = typeof matchProfiles.$inferInsert;
export type MatchPresentation = typeof matchPresentations.$inferSelect;
export type NewMatchPresentation = typeof matchPresentations.$inferInsert;
