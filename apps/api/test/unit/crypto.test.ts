import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/shared/crypto/password.js';
import {
  issueAccessToken,
  verifyAccessToken,
  mintRefreshToken,
  hashRefreshToken,
} from '../../src/shared/crypto/tokens.js';

describe('password hashing', () => {
  it('hashes into argon2id and verifies', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces different hashes for the same input (random salt)', async () => {
    const a = await hashPassword('same input');
    const b = await hashPassword('same input');
    expect(a).not.toBe(b);
  });
});

describe('access tokens', () => {
  it('round-trips userId and sessionId via JWT', async () => {
    const jwt = await issueAccessToken({ userId: 'u-1', sessionId: 's-1' });
    const claims = await verifyAccessToken(jwt);
    expect(claims.userId).toBe('u-1');
    expect(claims.sessionId).toBe('s-1');
  });

  it('rejects tampered tokens', async () => {
    const jwt = await issueAccessToken({ userId: 'u-1', sessionId: 's-1' });
    await expect(verifyAccessToken(jwt + 'x')).rejects.toThrow();
  });
});

describe('refresh tokens', () => {
  it('mints 64-hex-char tokens with stable SHA-256 hashes', () => {
    const t = mintRefreshToken();
    expect(t).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRefreshToken(t)).toBe(hashRefreshToken(t));
    expect(hashRefreshToken(t)).not.toBe(t);
  });
});
