import { beforeAll, afterEach, afterAll } from 'vitest';
import postgres from 'postgres';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgres://knot:knot@localhost:5432/knot_test';
process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(64);
process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(64);
process.env.PASSWORD_PEPPER ??= 'c'.repeat(32);
process.env.ENCRYPTION_KEY ??= 'd'.repeat(32);
process.env.S3_ENDPOINT ??= 'http://localhost:9000';
process.env.S3_REGION ??= 'us-east-1';
process.env.S3_BUCKET ??= 'knot-test';
process.env.S3_ACCESS_KEY_ID ??= 'minioadmin';
process.env.S3_SECRET_ACCESS_KEY ??= 'minioadmin';
process.env.S3_FORCE_PATH_STYLE ??= 'true';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.MAIL_BACKEND ??= 'console';
process.env.PUBLIC_URL ??= 'http://localhost:3001';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

beforeAll(async () => {
  const t = await sql`SELECT to_regclass('public.users') AS users, to_regclass('public.auth_sessions') AS sessions`;
  if (!t[0]?.users || !t[0]?.sessions) {
    throw new Error('Test DB is not migrated. Run `DATABASE_URL=... pnpm --filter @knot/api db:migrate`.');
  }
});

afterEach(async () => {
  await sql`TRUNCATE voice_recordings, voice_prompts, auth_sessions, users, waitlist_signups RESTART IDENTITY CASCADE`;
});

afterAll(async () => {
  await sql.end({ timeout: 5 });
});
