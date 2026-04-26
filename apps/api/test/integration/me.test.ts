import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

const signup = {
  email: 'me@knot.app',
  password: 'CorrectHorseBatteryStaple',
  phone: '+56911111111',
  firstName: 'Me',
  dateOfBirth: '1990-01-15',
  gender: 'male',
  locale: 'es',
};

beforeAll(async () => { app = await buildServer(); await app.ready(); });
afterAll(async () => { await app.close(); });

describe('GET /v1/me', () => {
  it('401 without Bearer token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me/' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('auth.missing_bearer');
  });

  it('401 with bogus token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/me/',
      headers: { authorization: 'Bearer not-a-jwt' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('auth.invalid_token');
  });

  it('200 with valid access token after signup', async () => {
    const su = await app.inject({ method: 'POST', url: '/v1/auth/signup', payload: signup });
    const { accessToken } = su.json();
    const res = await app.inject({
      method: 'GET',
      url: '/v1/me/',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(signup.email);
  });
});
