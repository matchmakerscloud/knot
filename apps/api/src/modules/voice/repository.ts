import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../../shared/db/client.js';
import {
  voicePrompts,
  voiceRecordings,
  type VoicePrompt,
  type VoiceRecording,
  type NewVoiceRecording,
} from '../../shared/db/schema/voice.js';

export class VoicePromptsRepository {
  constructor(private readonly db: Database) {}

  async listAvailable(opts: { locale: string; category?: 'mandatory' | 'elective' }): Promise<VoicePrompt[]> {
    const where = opts.category
      ? and(eq(voicePrompts.locale, opts.locale), eq(voicePrompts.category, opts.category), eq(voicePrompts.active, true))
      : and(eq(voicePrompts.locale, opts.locale), eq(voicePrompts.active, true));
    return this.db.select().from(voicePrompts).where(where).orderBy(asc(voicePrompts.text));
  }

  async findById(id: string): Promise<VoicePrompt | null> {
    const [row] = await this.db.select().from(voicePrompts).where(eq(voicePrompts.id, id)).limit(1);
    return row ?? null;
  }
}

export class VoiceRecordingsRepository {
  constructor(private readonly db: Database) {}

  async create(input: NewVoiceRecording): Promise<VoiceRecording> {
    const [row] = await this.db.insert(voiceRecordings).values(input).returning();
    if (!row) throw new Error('voice_recordings.insert.no_row_returned');
    return row;
  }

  async findById(id: string): Promise<VoiceRecording | null> {
    const [row] = await this.db
      .select()
      .from(voiceRecordings)
      .where(eq(voiceRecordings.id, id))
      .limit(1);
    return row ?? null;
  }

  async findByUserAndPosition(userId: string, position: number): Promise<VoiceRecording | null> {
    const [row] = await this.db
      .select()
      .from(voiceRecordings)
      .where(and(eq(voiceRecordings.userId, userId), eq(voiceRecordings.position, position)))
      .limit(1);
    return row ?? null;
  }

  async listByUser(userId: string): Promise<VoiceRecording[]> {
    return this.db
      .select()
      .from(voiceRecordings)
      .where(eq(voiceRecordings.userId, userId))
      .orderBy(asc(voiceRecordings.position));
  }

  async archive(id: string): Promise<void> {
    await this.db
      .update(voiceRecordings)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(voiceRecordings.id, id));
  }
}
