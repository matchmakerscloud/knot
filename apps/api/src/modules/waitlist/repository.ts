import { eq, sql } from 'drizzle-orm';
import type { Database } from '../../shared/db/client.js';
import {
  waitlistSignups,
  type WaitlistSignup,
  type NewWaitlistSignup,
} from '../../shared/db/schema/waitlist.js';

export class WaitlistRepository {
  constructor(private readonly db: Database) {}

  async findByEmail(email: string): Promise<WaitlistSignup | null> {
    const [row] = await this.db
      .select()
      .from(waitlistSignups)
      .where(eq(sql`lower(${waitlistSignups.email})`, email.toLowerCase()))
      .limit(1);
    return row ?? null;
  }

  async create(input: NewWaitlistSignup): Promise<WaitlistSignup> {
    const [row] = await this.db
      .insert(waitlistSignups)
      .values({ ...input, email: input.email.toLowerCase() })
      .returning();
    if (!row) throw new Error('waitlist.insert.no_row_returned');
    return row;
  }

  async findById(id: string): Promise<WaitlistSignup | null> {
    const [row] = await this.db.select().from(waitlistSignups).where(eq(waitlistSignups.id, id)).limit(1);
    return row ?? null;
  }

  async confirm(id: string): Promise<void> {
    await this.db
      .update(waitlistSignups)
      .set({ status: 'confirmed', confirmedAt: new Date(), updatedAt: new Date() })
      .where(eq(waitlistSignups.id, id));
  }
}
