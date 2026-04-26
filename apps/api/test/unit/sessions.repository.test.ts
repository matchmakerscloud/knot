import { describe, it, expect } from 'vitest';
import { db } from '../../src/shared/db/client.js';
import { UsersRepository } from '../../src/modules/auth/repositories/users.repository.js';
import { SessionsRepository } from '../../src/modules/auth/repositories/sessions.repository.js';

const users = new UsersRepository(db);
const sessions = new SessionsRepository(db);

describe('SessionsRepository', () => {
  it('creates, finds by hash, and revokes', async () => {
    const u = await users.create({
      email: 's@s.com',
      phone: '+56911111111',
      passwordHash: 'h',
      firstName: 'S',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      genderOtherLabel: null,
      locale: 'es',
    });
    const session = await sessions.create({
      userId: u.id,
      refreshTokenHash: 'hash-1',
      deviceId: 'dev',
      deviceName: 'Pixel',
      userAgent: 'ua',
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    expect(session.id).toBeDefined();

    const got = await sessions.findActiveByHash('hash-1');
    expect(got?.userId).toBe(u.id);

    await sessions.revoke(session.id);
    expect(await sessions.findActiveByHash('hash-1')).toBeNull();
  });

  it('expired sessions are not active', async () => {
    const u = await users.create({
      email: 'e@e.com',
      phone: '+56933333333',
      passwordHash: 'h',
      firstName: 'E',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      genderOtherLabel: null,
      locale: 'es',
    });
    await sessions.create({
      userId: u.id,
      refreshTokenHash: 'hash-2',
      deviceId: null,
      deviceName: null,
      userAgent: null,
      ipAddress: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await sessions.findActiveByHash('hash-2')).toBeNull();
  });
});
