import { pgTable, uuid, text, integer, timestamp, pgEnum, index, bigserial } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const knotChannel = pgEnum('knot_channel', ['confidant', 'match_onboarding', 'voice_helper', 'words_helper']);
export const knotMessageRole = pgEnum('knot_message_role', ['user', 'knot', 'system']);

export const knotConversations = pgTable(
  'knot_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    channel: knotChannel('channel').notNull(),
    dayIndex: integer('day_index'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userChannelIdx: index('idx_knot_conv_user_channel').on(t.userId, t.channel) }),
);

export const knotConversationMessages = pgTable(
  'knot_conversation_messages',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    conversationId: uuid('conversation_id').notNull().references(() => knotConversations.id, { onDelete: 'cascade' }),
    role: knotMessageRole('role').notNull(),
    content: text('content').notNull(),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    model: text('model'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ convIdx: index('idx_knot_conv_msgs_conv').on(t.conversationId, t.createdAt) }),
);

export type KnotConversation = typeof knotConversations.$inferSelect;
export type NewKnotConversation = typeof knotConversations.$inferInsert;
export type KnotConversationMessage = typeof knotConversationMessages.$inferSelect;
export type NewKnotConversationMessage = typeof knotConversationMessages.$inferInsert;
