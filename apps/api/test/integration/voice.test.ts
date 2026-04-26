import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildServer } from '../../src/app.js';
import { db } from '../../src/shared/db/client.js';
import { voicePrompts } from '../../src/shared/db/schema/voice.js';
import { getStorage } from '../../src/shared/storage/index.js';
import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';

let app: FastifyInstance;
let accessToken: string;
let userId: string;
let mandatoryPromptId: string;

const signup = {
  email: 'voice@knot.app',
  password: 'CorrectHorseBatteryStaple',
  phone: '+56911111111',
  firstName: 'V',
  dateOfBirth: '1990-01-15',
  gender: 'male',
  locale: 'es',
};

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});
afterAll(async () => { await app.close(); });

beforeEach(async () => {
  // Seed at least one prompt of each category in es (truncate runs after each)
  const inserted = await db
    .insert(voicePrompts)
    .values([
      { text: 'Test mandatory ES', category: 'mandatory', locale: 'es' },
      { text: 'Test elective ES', category: 'elective', locale: 'es' },
    ])
    .returning();
  mandatoryPromptId = inserted[0]!.id;

  const su = await app.inject({ method: 'POST', url: '/v1/auth/signup', payload: signup });
  const body = su.json();
  accessToken = body.accessToken;
  userId = body.user.id;
});

// Voice tables also need to be truncated; setup.ts truncates users + auth_sessions + waitlist_signups.
// We add voice_prompts and voice_recordings here.
beforeAll(async () => {
  // No-op; rely on test db isolation
});

describe('GET /v1/voice/prompts/available', () => {
  it('401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/voice/prompts/available' });
    expect(res.statusCode).toBe(401);
  });

  it('returns prompts filtered by locale and category', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/voice/prompts/available?locale=es&category=mandatory',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.prompts)).toBe(true);
    expect(body.prompts.length).toBeGreaterThan(0);
    expect(body.prompts.every((p: { category: string }) => p.category === 'mandatory')).toBe(true);
  });

  it('returns es prompts by default', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/voice/prompts/available',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.prompts.every((p: { locale: string }) => p.locale === 'es')).toBe(true);
  });
});

describe('POST /v1/voice/recordings', () => {
  async function uploadFakeAudio(): Promise<{ storageKey: string }> {
    const storage = getStorage();
    const key = storage.buildKey('voice', userId, 'recid', 'webm');
    await storage.putObject(key, Buffer.from('fake-audio-binary'), 'audio/webm');
    return { storageKey: key };
  }

  it('202 creates a recording with status processing', async () => {
    const { storageKey } = await uploadFakeAudio();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/voice/recordings',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        promptId: mandatoryPromptId,
        position: 1,
        storageKey,
        contentType: 'audio/webm',
        durationSeconds: 12.5,
      },
    });
    expect(res.statusCode).toBe(202);
    const body = res.json();
    expect(body.status).toBe('processing');
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects storage key that does not belong to current user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/voice/recordings',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        promptId: mandatoryPromptId,
        position: 1,
        storageKey: 'voice/some-other-user-id/whatever.webm',
        contentType: 'audio/webm',
        durationSeconds: 12.5,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('voice.recording.storage_key_mismatch');
  });

  it('rejects unknown promptId', async () => {
    const { storageKey } = await uploadFakeAudio();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/voice/recordings',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        promptId: '00000000-0000-0000-0000-000000000000',
        position: 1,
        storageKey,
        contentType: 'audio/webm',
        durationSeconds: 12.5,
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('voice.prompt.not_found');
  });

  it('rejects duplicate position for same user', async () => {
    const { storageKey: k1 } = await uploadFakeAudio();
    await app.inject({
      method: 'POST',
      url: '/v1/voice/recordings',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { promptId: mandatoryPromptId, position: 1, storageKey: k1, contentType: 'audio/webm', durationSeconds: 10 },
    });
    const { storageKey: k2 } = await uploadFakeAudio();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/voice/recordings',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { promptId: mandatoryPromptId, position: 1, storageKey: k2, contentType: 'audio/webm', durationSeconds: 10 },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('voice.position_in_use');
  });

  it('rejects when no object present at storageKey', async () => {
    const ghost = `voice/${userId}/ghost-resource/non-existent.webm`;
    const res = await app.inject({
      method: 'POST',
      url: '/v1/voice/recordings',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { promptId: mandatoryPromptId, position: 1, storageKey: ghost, contentType: 'audio/webm', durationSeconds: 10 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('voice.recording.upload_missing');
  });

  it('rejects duration outside 1-30s via Zod (5xx fallback caught — should be 400)', async () => {
    const { storageKey } = await uploadFakeAudio();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/voice/recordings',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { promptId: mandatoryPromptId, position: 1, storageKey, contentType: 'audio/webm', durationSeconds: 45 },
    });
    expect(res.statusCode).toBe(400);
  });
});
