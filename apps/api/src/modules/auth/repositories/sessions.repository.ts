import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Database } from '../../../shared/db/client.js';
import { authSessions, type AuthSession, type NewAuthSession } from '../../../shared/db/schema/auth-sessions.js';

export type CreateSessionInput = Pick<
  NewAuthSession,
  'userId' | 'refreshTokenHash' | 'deviceId' | 'deviceName' | 'userAgent' | 'ipAddress' | 'expiresAt'
>;

export class SessionsRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateSessionInput): Promise<AuthSession> {
    const [row] = await this.db.insert(authSessions).values(input).returning();
    if (!row) throw new Error('auth_sessions.insert.no_row_returned');
    return row;
  }

  async findActiveByHash(hash: string): Promise<AuthSession | null> {
    const [row] = await this.db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.refreshTokenHash, hash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async touch(id: string): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(authSessions.id, id));
  }

  async revoke(id: string): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.id, id));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
  }
}
