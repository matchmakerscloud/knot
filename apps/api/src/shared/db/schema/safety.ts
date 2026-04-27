import { pgTable, uuid, text, timestamp, pgEnum, primaryKey, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const reportTargetKind = pgEnum('report_target_kind', ['user', 'voice_recording', 'words_response', 'message', 'photo']);
export const reportStatus = pgEnum('report_status', ['pending', 'reviewing', 'resolved_actioned', 'resolved_dismissed']);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    targetKind: reportTargetKind('target_kind').notNull(),
    targetId: uuid('target_id').notNull(),
    reason: text('reason').notNull(),
    details: text('details'),
    status: reportStatus('status').notNull().default('pending'),
    reviewerId: uuid('reviewer_id').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    resolutionNotes: text('resolution_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pendingIdx: index('idx_reports_pending').on(t.createdAt),
    targetIdx: index('idx_reports_target').on(t.targetKind, t.targetId),
  }),
);

export const blocks = pgTable(
  'blocks',
  {
    blockerId: uuid('blocker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.blockerId, t.blockedId] }),
    blockedIdx: index('idx_blocks_blocked').on(t.blockedId),
  }),
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type Block = typeof blocks.$inferSelect;
export type NewBlock = typeof blocks.$inferInsert;
