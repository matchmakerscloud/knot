import { describe, it, expect } from 'vitest';
import { db } from '../../src/shared/db/client.js';
import { UsersRepository } from '../../src/modules/auth/repositories/users.repository.js';
import { SessionsRepository } from '../../src/modules/auth/repositories/sessions.repository.js';
import { AuthService } from '../../src/modules/auth/services/auth.service.js';
import { ConflictError } from '../../src/shared/errors.js';

const svc = new AuthService(new UsersRepository(db), new SessionsRepository(db));
const validSignup = {
  email: 'mario@example.com',
  password: 'CorrectHorseBatteryStaple',
  phone: '+56911111111',
  firstName: 'Mario',
  dateOfBirth: '1990-01-15',
  gender: 'male' as const,
  locale: 'es' as const,
};

describe('AuthService.signup', () => {
  it('creates a user, hashes password, opens a session, returns tokens', async () => {
    const out = await svc.signup(validSignup, { ipAddress: '1.1.1.1', userAgent: 'vitest' });
    expect(out.user.email).toBe('mario@example.com');
    expect(out.accessToken.length).toBeGreaterThan(20);
    expect(out.refreshToken).toMatch(/^[a-f0-9]{64}$/);
    expect(out.expiresIn).toBe(900);
  });

  it('rejects duplicate email with ConflictError', async () => {
    await svc.signup(validSignup, {});
    await expect(svc.signup(validSignup, {})).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('AuthService.login', () => {
  it('returns tokens for valid credentials', async () => {
    await svc.signup(validSignup, {});
    const out = await svc.login({ email: validSignup.email, password: validSignup.password }, {});
    expect(out.user.email).toBe(validSignup.email);
    expect(out.accessToken).toBeTruthy();
  });

  it('rejects invalid password with auth.invalid_credentials', async () => {
    await svc.signup(validSignup, {});
    await expect(
      svc.login({ email: validSignup.email, password: 'wrong' }, {}),
    ).rejects.toMatchObject({ code: 'auth.invalid_credentials', statusCode: 401 });
  });

  it('rejects unknown email with auth.invalid_credentials (no user enumeration)', async () => {
    await expect(
      svc.login({ email: 'no@one.com', password: 'whatever' }, {}),
    ).rejects.toMatchObject({ code: 'auth.invalid_credentials', statusCode: 401 });
  });
});

describe('AuthService.refresh', () => {
  it('rotates refresh token and revokes the old session', async () => {
    const initial = await svc.signup(validSignup, {});
    const next = await svc.refresh({ refreshToken: initial.refreshToken }, {});
    expect(next.refreshToken).not.toBe(initial.refreshToken);
    await expect(svc.refresh({ refreshToken: initial.refreshToken }, {})).rejects.toMatchObject({
      code: 'auth.refresh_invalid',
    });
  });

  it('rejects unknown refresh token', async () => {
    await expect(
      svc.refresh({ refreshToken: 'a'.repeat(64) }, {}),
    ).rejects.toMatchObject({ code: 'auth.refresh_invalid' });
  });
});

describe('AuthService.logout', () => {
  it('revokes the session bound to the refresh token', async () => {
    const initial = await svc.signup(validSignup, {});
    await svc.logout(initial.refreshToken);
    await expect(svc.refresh({ refreshToken: initial.refreshToken }, {})).rejects.toMatchObject({
      code: 'auth.refresh_invalid',
    });
  });

  it('is idempotent for unknown tokens (no info leak)', async () => {
    await expect(svc.logout('unknown')).resolves.toBeUndefined();
  });
});
