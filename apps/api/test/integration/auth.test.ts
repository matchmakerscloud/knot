import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

const signup = {
  email: 'integration@knot.app',
  password: 'CorrectHorseBatteryStaple',
  phone: '+56911111111',
  firstName: 'Mario',
  dateOfBirth: '1990-01-15',
  gender: 'male',
  locale: 'es',
};

beforeAll(async () => { app = await buildServer(); await app.ready(); });
afterAll(async () => { await app.close(); });

describe('POST /v1/auth/signup', () => {
  it('201 returns user + tokens', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/signup', payload: signup });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe(signup.email);
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toMatch(/^[a-f0-9]{64}$/);
    expect(body.expiresIn).toBe(900);
  });

  it('409 on duplicate email with code auth.email_in_use', async () => {
    await app.inject({ method: 'POST', url: '/v1/auth/signup', payload: signup });
    const res = await app.inject({ method: 'POST', url: '/v1/auth/signup', payload: signup });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('auth.email_in_use');
  });

  it('400 on validation error (short password)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/auth/signup',
      payload: { ...signup, password: 'short' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('common.validation_failed');
  });
});

describe('POST /v1/auth/login', () => {
  it('200 returns tokens for correct credentials', async () => {
    await app.inject({ method: 'POST', url: '/v1/auth/signup', payload: signup });
    const res = await app.inject({
      method: 'POST', url: '/v1/auth/login',
      payload: { email: signup.email, password: signup.password },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeTruthy();
  });

  it('401 with auth.invalid_credentials for wrong password', async () => {
    await app.inject({ method: 'POST', url: '/v1/auth/signup', payload: signup });
    const res = await app.inject({
      method: 'POST', url: '/v1/auth/login',
      payload: { email: signup.email, password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('auth.invalid_credentials');
  });
});

describe('POST /v1/auth/refresh', () => {
  it('rotates the refresh token and revokes the old one', async () => {
    const su = await app.inject({ method: 'POST', url: '/v1/auth/signup', payload: signup });
    const initial = su.json();

    const r1 = await app.inject({
      method: 'POST', url: '/v1/auth/refresh',
      payload: { refreshToken: initial.refreshToken },
    });
    expect(r1.statusCode).toBe(200);
    const next = r1.json();
    expect(next.refreshToken).not.toBe(initial.refreshToken);

    const r2 = await app.inject({
      method: 'POST', url: '/v1/auth/refresh',
      payload: { refreshToken: initial.refreshToken },
    });
    expect(r2.statusCode).toBe(401);
    expect(r2.json().error.code).toBe('auth.refresh_invalid');
  });
});

describe('POST /v1/auth/logout', () => {
  it('200 idempotent; further refresh fails', async () => {
    const su = await app.inject({ method: 'POST', url: '/v1/auth/signup', payload: signup });
    const initial = su.json();

    const lo = await app.inject({
      method: 'POST', url: '/v1/auth/logout',
      payload: { refreshToken: initial.refreshToken },
    });
    expect(lo.statusCode).toBe(200);
    expect(lo.json()).toEqual({ ok: true });

    const r = await app.inject({
      method: 'POST', url: '/v1/auth/refresh',
      payload: { refreshToken: initial.refreshToken },
    });
    expect(r.statusCode).toBe(401);
  });
});
