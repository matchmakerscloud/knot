import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let accessToken: string;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
  // Bootstrap a user + token
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/signup',
    payload: {
      email: 'upload@knot.app',
      password: 'CorrectHorseBatteryStaple',
      phone: '+56911111111',
      firstName: 'U',
      dateOfBirth: '1990-01-15',
      gender: 'male',
      locale: 'es',
    },
  });
  accessToken = res.json().accessToken;
});
afterAll(async () => { await app.close(); });

describe('POST /v1/uploads/audio/sign', () => {
  it('401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/uploads/audio/sign',
      payload: { contentType: 'audio/webm', extension: 'webm' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('200 returns presigned url + resourceId for audio/webm', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/uploads/audio/sign',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { contentType: 'audio/webm', extension: 'webm' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.url).toContain('X-Amz-Signature');
    expect(body.key).toMatch(/^voice\//);
    expect(body.resourceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.expiresIn).toBe(300);
  });

  it('400 on unsupported content type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/uploads/audio/sign',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { contentType: 'video/mp4', extension: 'mp4' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('upload.audio.unsupported_content_type');
  });
});

describe('POST /v1/uploads/photo/sign', () => {
  it('200 returns presigned url for image/jpeg', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/uploads/photo/sign',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { contentType: 'image/jpeg', extension: 'jpg' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().key).toMatch(/^photo\//);
  });

  it('400 on gif', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/uploads/photo/sign',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { contentType: 'image/gif', extension: 'gif' },
    });
    expect(res.statusCode).toBe(400);
  });
});
