import { and, desc, eq, isNotNull, ne, notInArray, sql } from 'drizzle-orm';
import type { Database } from '../../shared/db/client.js';
import { voiceRecordings } from '../../shared/db/schema/voice.js';
import { voiceFeedEvents, voiceReplies, type VoiceReply, type NewVoiceReply, type NewVoiceFeedEvent } from '../../shared/db/schema/voice-feed.js';
import { users, type User } from '../../shared/db/schema/users.js';
import type { VoiceRecording } from '../../shared/db/schema/voice.js';

export class VoiceFeedRepository {
  constructor(private readonly db: Database) {}

  /**
   * Pick the next active recording for a user that:
   *  - belongs to a different user
   *  - the user has NOT acted on (skipped/replied/listened_full/saved) recently
   *  - is currently active
   * Order: most recent first (algorithm refinement post-MVP per spec §3.1).
   */
  async nextForUser(userId: string): Promise<{ recording: VoiceRecording; user: User } | null> {
    // Get IDs of recordings the user has already interacted with terminally.
    const seenIds = await this.db
      .selectDistinct({ id: voiceFeedEvents.recordingId })
      .from(voiceFeedEvents)
      .where(
        and(
          eq(voiceFeedEvents.userId, userId),
          // Treat skipped/replied/listened_full as "done"; viewed alone is OK to revisit
          sql`${voiceFeedEvents.action} IN ('skipped','replied','listened_full','saved')`,
        ),
      );
    const excluded = seenIds.map((r) => r.id);

    const where = and(
      eq(voiceRecordings.status, 'active'),
      ne(voiceRecordings.userId, userId),
      excluded.length > 0 ? notInArray(voiceRecordings.id, excluded) : undefined,
    );

    const [row] = await this.db
      .select({ recording: voiceRecordings, user: users })
      .from(voiceRecordings)
      .innerJoin(users, eq(users.id, voiceRecordings.userId))
      .where(where)
      .orderBy(desc(voiceRecordings.createdAt))
      .limit(1);

    return row ?? null;
  }

  async listSavedForUser(userId: string): Promise<VoiceRecording[]> {
    const saved = await this.db
      .select({ id: voiceFeedEvents.recordingId })
      .from(voiceFeedEvents)
      .where(and(eq(voiceFeedEvents.userId, userId), eq(voiceFeedEvents.action, 'saved')))
      .orderBy(desc(voiceFeedEvents.createdAt));
    if (saved.length === 0) return [];
    const ids = saved.map((s) => s.id);
    return this.db
      .select()
      .from(voiceRecordings)
      .where(and(notInArray(voiceRecordings.id, ['']), sql`${voiceRecordings.id} IN (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})`));
  }

  async recordEvent(input: NewVoiceFeedEvent): Promise<void> {
    await this.db.insert(voiceFeedEvents).values(input);
  }
}

export class VoiceRepliesRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewVoiceReply): Promise<VoiceReply> {
    const [row] = await this.db.insert(voiceReplies).values(input).returning();
    if (!row) throw new Error('voice_replies.insert.no_row_returned');
    return row;
  }

  async findById(id: string): Promise<VoiceReply | null> {
    const [row] = await this.db.select().from(voiceReplies).where(eq(voiceReplies.id, id)).limit(1);
    return row ?? null;
  }

  /** Has user `from` replied to user `to` within the last 30 days, status pending or replied_back? */
  async findOpenReplyBetween(fromUserId: string, toUserId: string): Promise<VoiceReply | null> {
    const [row] = await this.db
      .select()
      .from(voiceReplies)
      .where(
        and(
          eq(voiceReplies.fromUserId, fromUserId),
          eq(voiceReplies.toUserId, toUserId),
          sql`${voiceReplies.status} IN ('pending','replied_back')`,
          sql`${voiceReplies.expiresAt} > NOW()`,
        ),
      )
      .orderBy(desc(voiceReplies.createdAt))
      .limit(1);
    return row ?? null;
  }

  async listReceivedPending(userId: string): Promise<VoiceReply[]> {
    return this.db
      .select()
      .from(voiceReplies)
      .where(
        and(
          eq(voiceReplies.toUserId, userId),
          eq(voiceReplies.status, 'pending'),
          sql`${voiceReplies.expiresAt} > NOW()`,
        ),
      )
      .orderBy(desc(voiceReplies.createdAt));
  }

  async markRepliedBack(id: string, chamberId: string): Promise<void> {
    await this.db
      .update(voiceReplies)
      .set({ status: 'replied_back', chamberId, updatedAt: new Date() })
      .where(eq(voiceReplies.id, id));
  }
}

export class ChambersRepository {
  // Implemented inline in the module to avoid additional churn; used by reply→match flow.
  constructor(private readonly _db: Database) {}
}
