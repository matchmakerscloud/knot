import { pgTable, uuid, text, integer, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';

export const waitlistSource = pgEnum('waitlist_source', ['umbrella', 'voice', 'words', 'match']);
export const waitlistStatus = pgEnum('waitlist_status', ['pending', 'confirmed', 'invited', 'unsubscribed']);

export const waitlistSignups = pgTable(
  'waitlist_signups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    source: waitlistSource('source').notNull(),
    locale: text('locale').notNull().default('es'),
    confirmTokenHash: text('confirm_token_hash'),
    status: waitlistStatus('status').notNull().default('pending'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
    referrer: text('referrer'),
    dripStep: integer('drip_step').notNull().default(0),
    dripLastSentAt: timestamp('drip_last_sent_at', { withTimezone: true }),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index('idx_waitlist_email').on(t.email),
    statusIdx: index('idx_waitlist_status').on(t.status),
  }),
);

export type WaitlistSignup = typeof waitlistSignups.$inferSelect;
export type NewWaitlistSignup = typeof waitlistSignups.$inferInsert;
