import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';
import { db } from '../../src/shared/db/client.js';
import { waitlistSignups } from '../../src/shared/db/schema/waitlist.js';
import { eq } from 'drizzle-orm';

let app: FastifyInstance;

beforeAll(async () => { app = await buildServer(); await app.ready(); });
afterAll(async () => { await app.close(); });

describe('POST /v1/waitlist', () => {
  it('201 creates a pending signup with default source=umbrella', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/waitlist/',
      payload: { email: 'mario@example.com' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.signupId).toBeDefined();

    const [row] = await db.select().from(waitlistSignups).where(eq(waitlistSignups.id, body.signupId));
    expect(row?.email).toBe('mario@example.com');
    expect(row?.source).toBe('umbrella');
    expect(row?.status).toBe('pending');
    expect(row?.confirmTokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('accepts source=voice|words|match and persists locale', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/waitlist/',
      payload: { email: 'voice@example.com', source: 'voice', locale: 'en' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    const [row] = await db.select().from(waitlistSignups).where(eq(waitlistSignups.id, body.signupId));
    expect(row?.source).toBe('voice');
    expect(row?.locale).toBe('en');
  });

  it('400 invalid email', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/waitlist/',
      payload: { email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('common.validation_failed');
  });

  it('202 idempotent re-signup with same email (no info leak)', async () => {
    await app.inject({ method: 'POST', url: '/v1/waitlist/', payload: { email: 'dup@example.com' } });
    const res = await app.inject({
      method: 'POST', url: '/v1/waitlist/',
      payload: { email: 'dup@example.com' },
    });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({ ok: true, alreadyOnList: true });
  });

  it('captures UTM + referrer fields', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/waitlist/',
      payload: {
        email: 'utm@example.com',
        source: 'words',
        utmSource: 'twitter',
        utmMedium: 'organic',
        utmCampaign: 'words-launch',
        referrer: 'https://t.co/foo',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    const [row] = await db.select().from(waitlistSignups).where(eq(waitlistSignups.id, body.signupId));
    expect(row?.utmSource).toBe('twitter');
    expect(row?.utmCampaign).toBe('words-launch');
    expect(row?.referrer).toBe('https://t.co/foo');
  });
});

describe('GET /v1/waitlist/confirm', () => {
  it('rejects bad signature', async () => {
    const su = await app.inject({
      method: 'POST', url: '/v1/waitlist/',
      payload: { email: 'confirm@example.com' },
    });
    const { signupId } = su.json();
    const res = await app.inject({
      method: 'GET',
      url: `/v1/waitlist/confirm?id=${signupId}&t=${'0'.repeat(64)}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it('rejects unknown id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/waitlist/confirm?id=00000000-0000-0000-0000-000000000000&t=${'a'.repeat(64)}`,
    });
    expect(res.statusCode).toBe(404);
  });
});
