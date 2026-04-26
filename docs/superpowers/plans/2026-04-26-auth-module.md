# Auth module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Knot authentication module — signup, login, refresh, logout — with persistent sessions, secure password hashing, and integration tests against a real Postgres.

**Architecture:** Fastify monolithic API with module-based layout (`controllers/services/repositories`). Access tokens are short-lived JWTs (15 min) signed with HS256; refresh tokens are random 256-bit secrets, **only their SHA-256 hash is stored** in `auth_sessions`. Argon2id with global pepper hashes user passwords. Zod schemas live in `@knot/shared-types` so clients reuse them. All HTTP handlers are thin; business logic lives in services; DB I/O lives in repositories.

**Tech Stack:** Node 20, TypeScript strict, Fastify 4, Drizzle ORM, postgres-js, Zod, Argon2, jose (JWT), Vitest, pnpm + Turbo.

---

## Pre-work — environment sanity

Run once before starting. The plan assumes the dev environment described in `docs/getting-started.md` is up.

- [ ] **0.1 — Verify Node + pnpm + Docker.** `node -v` (≥20), `pnpm -v` (≥9), `docker compose version`.
- [ ] **0.2 — Bootstrap `.env`.**

  ```bash
  cd /home/feres/knot
  cp -n .env.example .env
  # Append generated secrets if missing
  grep -q '^JWT_ACCESS_SECRET=' .env && grep -v 'change_me' .env >/dev/null || {
    sed -i.bak 's|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET='"$(openssl rand -hex 64)"'|' .env
    sed -i.bak 's|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET='"$(openssl rand -hex 64)"'|' .env
    sed -i.bak 's|^PASSWORD_PEPPER=.*|PASSWORD_PEPPER='"$(openssl rand -hex 32)"'|' .env
    sed -i.bak 's|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY='"$(openssl rand -hex 32)"'|' .env
    rm -f .env.bak
  }
  ```

- [ ] **0.3 — Up Postgres + Redis + MinIO.** `docker compose -f infra/docker/docker-compose.dev.yml up -d`. Verify all `healthy`: `docker compose -f infra/docker/docker-compose.dev.yml ps`.
- [ ] **0.4 — Create test database.** Tests use a dedicated DB so they can `TRUNCATE` aggressively without nuking dev data.

  ```bash
  docker compose -f infra/docker/docker-compose.dev.yml exec -T postgres \
    psql -U knot -d postgres -c "CREATE DATABASE knot_test;"
  docker compose -f infra/docker/docker-compose.dev.yml exec -T postgres \
    psql -U knot -d knot_test -f /docker-entrypoint-initdb.d/init-db.sql
  ```

- [ ] **0.5 — Install monorepo deps.** `pnpm install` from repo root.

---

## File map

**Create**
- `apps/api/src/shared/db/schema/auth-sessions.ts` — Drizzle table + types.
- `apps/api/src/shared/crypto/password.ts` — Argon2id wrapper (pepper-aware).
- `apps/api/src/shared/crypto/tokens.ts` — JWT sign/verify + opaque refresh token mint/hash.
- `apps/api/src/shared/errors.ts` — `AppError`, `ValidationError`, `UnauthorizedError`, `ConflictError`.
- `apps/api/src/modules/auth/repositories/users.repository.ts`
- `apps/api/src/modules/auth/repositories/sessions.repository.ts`
- `apps/api/src/modules/auth/services/auth.service.ts`
- `apps/api/src/modules/auth/controllers/auth.controller.ts`
- `apps/api/src/modules/auth/schemas.ts` — request/response Zod (extends shared-types).
- `apps/api/src/modules/auth/index.ts` — Fastify plugin barrel.
- `apps/api/src/plugins/error-handler.ts` — translates `AppError` → HTTP.
- `apps/api/vitest.config.ts`
- `apps/api/test/setup.ts` — sets DATABASE_URL to `knot_test`, runs migrations once, truncates between tests.
- `apps/api/test/integration/auth.test.ts`
- `apps/api/test/unit/crypto.test.ts`
- `apps/api/test/unit/users.repository.test.ts`
- `apps/api/test/unit/sessions.repository.test.ts`
- `apps/api/test/unit/auth.service.test.ts`
- `apps/api/drizzle/<timestamped>.sql` — generated migration (auto-named).

**Modify**
- `apps/api/src/shared/db/schema/index.ts` — export new schema.
- `apps/api/src/shared/db/schema/users.ts` — add `WHERE deleted_at IS NULL` partial indexes (matches data-model spec).
- `apps/api/src/config/index.ts` — already covers JWT + pepper; verify nothing missing.
- `apps/api/src/app.ts` — register error handler + auth plugin.
- `apps/api/package.json` — add deps (`argon2`, `jose`).
- `packages/shared-types/src/user.ts` — add `RefreshRequestSchema`, `LogoutResponseSchema`, `RefreshResponseSchema`.
- `packages/shared-types/src/index.ts` — export new schemas.
- `docs/api-contract.md` — already documents these endpoints; verify no drift.

---

## Task 1 — Add deps and types

**Files:**
- Modify: `apps/api/package.json`

- [ ] **1.1 — Install runtime deps.**

  ```bash
  pnpm --filter @knot/api add argon2@^0.40.0 jose@^5.6.0
  pnpm --filter @knot/api add -D @types/node@^20.14.0 @vitest/coverage-v8@^2.0.0 supertest@^7.0.0 @types/supertest@^6.0.0
  ```

  Expected: lockfile updated, `pnpm install` exits 0.

- [ ] **1.2 — Commit.**

  ```bash
  git add apps/api/package.json pnpm-lock.yaml
  git commit -m "chore(api): add argon2, jose, supertest deps for auth"
  ```

---

## Task 2 — `auth_sessions` Drizzle schema

**Files:**
- Create: `apps/api/src/shared/db/schema/auth-sessions.ts`
- Modify: `apps/api/src/shared/db/schema/index.ts`

- [ ] **2.1 — Write `auth-sessions.ts`.**

  ```ts
  import { pgTable, uuid, text, timestamp, inet, index } from 'drizzle-orm/pg-core';
  import { users } from './users.js';

  export const authSessions = pgTable(
    'auth_sessions',
    {
      id: uuid('id').primaryKey().defaultRandom(),
      userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
      refreshTokenHash: text('refresh_token_hash').notNull().unique(),
      deviceId: text('device_id'),
      deviceName: text('device_name'),
      userAgent: text('user_agent'),
      ipAddress: inet('ip_address'),
      expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
      revokedAt: timestamp('revoked_at', { withTimezone: true }),
      createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
      lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => ({
      userIdx: index('idx_sessions_user').on(t.userId),
    }),
  );

  export type AuthSession = typeof authSessions.$inferSelect;
  export type NewAuthSession = typeof authSessions.$inferInsert;
  ```

- [ ] **2.2 — Export it.** Edit `apps/api/src/shared/db/schema/index.ts`:

  ```ts
  export * from './users.js';
  export * from './auth-sessions.js';
  ```

- [ ] **2.3 — Generate migration.**

  ```bash
  pnpm --filter @knot/api db:generate
  ```

  Expected: a new `drizzle/0000_*.sql` (or numbered next) file with `CREATE TABLE auth_sessions` plus indexes.

- [ ] **2.4 — Apply migration to dev DB and to test DB.**

  ```bash
  pnpm --filter @knot/api db:migrate
  DATABASE_URL=postgres://knot:knot@localhost:5432/knot_test \
    pnpm --filter @knot/api db:migrate
  ```

  Expected: both runs print `Migrations complete.` Verify with `psql -d knot -U knot -c '\d auth_sessions'`.

- [ ] **2.5 — Commit.**

  ```bash
  git add apps/api/src/shared/db/schema apps/api/drizzle
  git commit -m "feat(api): add auth_sessions table for refresh tokens"
  ```

---

## Task 3 — Errors module

**Files:**
- Create: `apps/api/src/shared/errors.ts`
- Test: `apps/api/test/unit/errors.test.ts`

- [ ] **3.1 — Write the failing test.**

  ```ts
  // apps/api/test/unit/errors.test.ts
  import { describe, it, expect } from 'vitest';
  import { AppError, UnauthorizedError, ConflictError } from '../../src/shared/errors.js';

  describe('AppError', () => {
    it('captures code, status, message, and optional details', () => {
      const e = new AppError('foo.bar', 418, 'teapot', { hint: 'try coffee' });
      expect(e.code).toBe('foo.bar');
      expect(e.statusCode).toBe(418);
      expect(e.message).toBe('teapot');
      expect(e.details).toEqual({ hint: 'try coffee' });
    });

    it('UnauthorizedError defaults to 401 with auth.unauthorized', () => {
      const e = new UnauthorizedError();
      expect(e.statusCode).toBe(401);
      expect(e.code).toBe('auth.unauthorized');
    });

    it('ConflictError defaults to 409', () => {
      expect(new ConflictError('auth.email_in_use', 'email taken').statusCode).toBe(409);
    });
  });
  ```

- [ ] **3.2 — Run; expect FAIL (module missing).**

  ```bash
  pnpm --filter @knot/api test errors
  ```

  Expected: error like `Cannot find module '.../shared/errors'`.

- [ ] **3.3 — Implement.**

  ```ts
  // apps/api/src/shared/errors.ts
  export class AppError extends Error {
    constructor(
      public readonly code: string,
      public readonly statusCode: number,
      message: string,
      public readonly details?: Record<string, unknown>,
    ) {
      super(message);
      this.name = new.target.name;
    }
  }

  export class UnauthorizedError extends AppError {
    constructor(code = 'auth.unauthorized', message = 'Unauthorized', details?: Record<string, unknown>) {
      super(code, 401, message, details);
    }
  }

  export class ForbiddenError extends AppError {
    constructor(code = 'auth.forbidden', message = 'Forbidden') {
      super(code, 403, message);
    }
  }

  export class NotFoundError extends AppError {
    constructor(code = 'common.not_found', message = 'Not found') {
      super(code, 404, message);
    }
  }

  export class ConflictError extends AppError {
    constructor(code: string, message: string, details?: Record<string, unknown>) {
      super(code, 409, message, details);
    }
  }

  export class ValidationError extends AppError {
    constructor(code: string, message: string, details?: Record<string, unknown>) {
      super(code, 400, message, details);
    }
  }
  ```

- [ ] **3.4 — Run; expect PASS.** `pnpm --filter @knot/api test errors`.

- [ ] **3.5 — Commit.**

  ```bash
  git add apps/api/src/shared/errors.ts apps/api/test/unit/errors.test.ts
  git commit -m "feat(api): add typed AppError hierarchy"
  ```

---

## Task 4 — Password hashing util

**Files:**
- Create: `apps/api/src/shared/crypto/password.ts`
- Test: `apps/api/test/unit/crypto.test.ts`

- [ ] **4.1 — Write failing test.**

  ```ts
  // apps/api/test/unit/crypto.test.ts
  import { describe, it, expect } from 'vitest';
  import { hashPassword, verifyPassword } from '../../src/shared/crypto/password.js';

  describe('password hashing', () => {
    it('hashes deterministically into argon2id and verifies', async () => {
      const hash = await hashPassword('correct horse battery staple');
      expect(hash).toMatch(/^\$argon2id\$/);
      expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
      expect(await verifyPassword('wrong', hash)).toBe(false);
    });

    it('produces different hashes for same input (random salt)', async () => {
      const a = await hashPassword('same input');
      const b = await hashPassword('same input');
      expect(a).not.toBe(b);
    });
  });
  ```

- [ ] **4.2 — Run; FAIL (missing module).** `pnpm --filter @knot/api test crypto`.

- [ ] **4.3 — Implement.**

  ```ts
  // apps/api/src/shared/crypto/password.ts
  import argon2 from 'argon2';
  import { config } from '../../config/index.js';

  const PEPPER = Buffer.from(config.auth.passwordPepper, 'utf-8');

  const ARGON_OPTS = {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 64 * 1024, // 64 MiB
    parallelism: 1,
    secret: PEPPER,
  } as const;

  export async function hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON_OPTS);
  }

  export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain, { secret: PEPPER });
    } catch {
      return false;
    }
  }
  ```

- [ ] **4.4 — Run; PASS.** Verify hashes start with `$argon2id$`.

- [ ] **4.5 — Commit.**

  ```bash
  git add apps/api/src/shared/crypto/password.ts apps/api/test/unit/crypto.test.ts
  git commit -m "feat(api): add argon2id password hashing with pepper"
  ```

---

## Task 5 — Token util (JWT + opaque refresh)

**Files:**
- Create: `apps/api/src/shared/crypto/tokens.ts`
- Test: append to `apps/api/test/unit/crypto.test.ts`

- [ ] **5.1 — Append failing tests to `crypto.test.ts`.**

  ```ts
  import {
    issueAccessToken,
    verifyAccessToken,
    mintRefreshToken,
    hashRefreshToken,
  } from '../../src/shared/crypto/tokens.js';

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
    it('mints 64-hex-char tokens and stable SHA-256 hashes', () => {
      const t = mintRefreshToken();
      expect(t).toMatch(/^[a-f0-9]{64}$/);
      expect(hashRefreshToken(t)).toBe(hashRefreshToken(t));
      expect(hashRefreshToken(t)).not.toBe(t);
    });
  });
  ```

- [ ] **5.2 — Run; FAIL.**

- [ ] **5.3 — Implement.**

  ```ts
  // apps/api/src/shared/crypto/tokens.ts
  import { SignJWT, jwtVerify } from 'jose';
  import { randomBytes, createHash } from 'node:crypto';
  import { config } from '../../config/index.js';

  const ACCESS_SECRET = new TextEncoder().encode(config.auth.accessSecret);

  export interface AccessTokenClaims {
    userId: string;
    sessionId: string;
  }

  export async function issueAccessToken(claims: AccessTokenClaims): Promise<string> {
    return new SignJWT({ uid: claims.userId, sid: claims.sessionId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer('knot-api')
      .setAudience('knot-clients')
      .setExpirationTime(`${config.auth.accessTtlSeconds}s`)
      .sign(ACCESS_SECRET);
  }

  export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    const { payload } = await jwtVerify(token, ACCESS_SECRET, {
      issuer: 'knot-api',
      audience: 'knot-clients',
    });
    return { userId: String(payload.uid), sessionId: String(payload.sid) };
  }

  export function mintRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  export function hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  ```

- [ ] **5.4 — Run; PASS.**

- [ ] **5.5 — Commit.**

  ```bash
  git add apps/api/src/shared/crypto/tokens.ts apps/api/test/unit/crypto.test.ts
  git commit -m "feat(api): add JWT access + opaque refresh token utilities"
  ```

---

## Task 6 — Vitest setup with real Postgres

**Files:**
- Create: `apps/api/vitest.config.ts`, `apps/api/test/setup.ts`

- [ ] **6.1 — Write `vitest.config.ts`.**

  ```ts
  // apps/api/vitest.config.ts
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: {
      globals: false,
      environment: 'node',
      setupFiles: ['./test/setup.ts'],
      hookTimeout: 30_000,
      testTimeout: 20_000,
      include: ['test/**/*.test.ts'],
      coverage: { provider: 'v8', reporter: ['text', 'lcov'], include: ['src/**'] },
    },
  });
  ```

- [ ] **6.2 — Write `test/setup.ts`.**

  ```ts
  // apps/api/test/setup.ts
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
  process.env.REDIS_URL ??= 'redis://localhost:6379';

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  beforeAll(async () => {
    // Sanity: ensure schema is migrated. CI runs db:migrate before tests; fail loudly otherwise.
    const t = await sql`SELECT to_regclass('public.users') AS users, to_regclass('public.auth_sessions') AS sessions`;
    if (!t[0]?.users || !t[0]?.sessions) {
      throw new Error('Test DB is not migrated. Run `DATABASE_URL=... pnpm --filter @knot/api db:migrate`.');
    }
  });

  afterEach(async () => {
    await sql`TRUNCATE auth_sessions, users RESTART IDENTITY CASCADE`;
  });

  afterAll(async () => {
    await sql.end({ timeout: 5 });
  });
  ```

- [ ] **6.3 — Smoke run.**

  ```bash
  pnpm --filter @knot/api test
  ```

  Expected: previous unit tests still PASS (the truncate runs only when tables exist; setup itself proves migrations are in place).

- [ ] **6.4 — Commit.**

  ```bash
  git add apps/api/vitest.config.ts apps/api/test/setup.ts
  git commit -m "test(api): wire vitest to a real Postgres test database"
  ```

---

## Task 7 — Users repository

**Files:**
- Create: `apps/api/src/modules/auth/repositories/users.repository.ts`
- Test: `apps/api/test/unit/users.repository.test.ts`

- [ ] **7.1 — Write failing test.**

  ```ts
  // apps/api/test/unit/users.repository.test.ts
  import { describe, it, expect } from 'vitest';
  import { db } from '../../src/shared/db/client.js';
  import { UsersRepository } from '../../src/modules/auth/repositories/users.repository.js';

  const repo = new UsersRepository(db);

  describe('UsersRepository', () => {
    it('creates and finds by email (case-insensitive)', async () => {
      const created = await repo.create({
        email: 'Mario@Example.com',
        passwordHash: 'hash',
        firstName: 'Mario',
        dateOfBirth: '1990-01-15',
        gender: 'male',
        locale: 'es',
      });
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);

      const found = await repo.findByEmail('mario@example.com');
      expect(found?.id).toBe(created.id);
    });

    it('returns null for unknown email', async () => {
      expect(await repo.findByEmail('nope@example.com')).toBeNull();
    });

    it('findById returns the row including hash', async () => {
      const u = await repo.create({
        email: 'a@a.com', passwordHash: 'h', firstName: 'A',
        dateOfBirth: '1990-01-01', gender: 'female', locale: 'es',
      });
      const got = await repo.findById(u.id);
      expect(got?.email).toBe('a@a.com');
    });
  });
  ```

- [ ] **7.2 — Run; FAIL (module missing).**

- [ ] **7.3 — Implement.**

  ```ts
  // apps/api/src/modules/auth/repositories/users.repository.ts
  import { eq, sql } from 'drizzle-orm';
  import type { Database } from '../../../shared/db/client.js';
  import { users, type User, type NewUser } from '../../../shared/db/schema/users.js';

  export type CreateUserInput = Pick<
    NewUser,
    'email' | 'phone' | 'passwordHash' | 'firstName' | 'dateOfBirth' | 'gender' | 'genderOtherLabel' | 'locale'
  >;

  export class UsersRepository {
    constructor(private readonly db: Database) {}

    async create(input: CreateUserInput): Promise<User> {
      const [row] = await this.db
        .insert(users)
        .values({ ...input, email: input.email.toLowerCase() })
        .returning();
      if (!row) throw new Error('users.insert.no_row_returned');
      return row;
    }

    async findByEmail(email: string): Promise<User | null> {
      const [row] = await this.db
        .select()
        .from(users)
        .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
        .limit(1);
      return row ?? null;
    }

    async findById(id: string): Promise<User | null> {
      const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
      return row ?? null;
    }
  }
  ```

- [ ] **7.4 — Run; PASS.**

- [ ] **7.5 — Commit.**

  ```bash
  git add apps/api/src/modules/auth/repositories/users.repository.ts apps/api/test/unit/users.repository.test.ts
  git commit -m "feat(api): add UsersRepository (create, findByEmail, findById)"
  ```

---

## Task 8 — Sessions repository

**Files:**
- Create: `apps/api/src/modules/auth/repositories/sessions.repository.ts`
- Test: `apps/api/test/unit/sessions.repository.test.ts`

- [ ] **8.1 — Write failing test.**

  ```ts
  // apps/api/test/unit/sessions.repository.test.ts
  import { describe, it, expect } from 'vitest';
  import { db } from '../../src/shared/db/client.js';
  import { UsersRepository } from '../../src/modules/auth/repositories/users.repository.js';
  import { SessionsRepository } from '../../src/modules/auth/repositories/sessions.repository.js';

  const users = new UsersRepository(db);
  const sessions = new SessionsRepository(db);

  describe('SessionsRepository', () => {
    it('creates, finds by hash, and revokes', async () => {
      const u = await users.create({
        email: 's@s.com', passwordHash: 'h', firstName: 'S',
        dateOfBirth: '1990-01-01', gender: 'male', locale: 'es',
      });
      const session = await sessions.create({
        userId: u.id,
        refreshTokenHash: 'hash-1',
        deviceId: 'dev', deviceName: 'Pixel', userAgent: 'ua', ipAddress: '127.0.0.1',
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
        email: 'e@e.com', passwordHash: 'h', firstName: 'E',
        dateOfBirth: '1990-01-01', gender: 'male', locale: 'es',
      });
      await sessions.create({
        userId: u.id, refreshTokenHash: 'hash-2',
        expiresAt: new Date(Date.now() - 1000),
      });
      expect(await sessions.findActiveByHash('hash-2')).toBeNull();
    });
  });
  ```

- [ ] **8.2 — Run; FAIL.**

- [ ] **8.3 — Implement.**

  ```ts
  // apps/api/src/modules/auth/repositories/sessions.repository.ts
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
  ```

- [ ] **8.4 — Run; PASS.**

- [ ] **8.5 — Commit.**

  ```bash
  git add apps/api/src/modules/auth/repositories/sessions.repository.ts apps/api/test/unit/sessions.repository.test.ts
  git commit -m "feat(api): add SessionsRepository for refresh-token sessions"
  ```

---

## Task 9 — Shared-types: extend auth schemas

**Files:**
- Modify: `packages/shared-types/src/user.ts`
- Modify: `packages/shared-types/src/index.ts`

- [ ] **9.1 — Add schemas at end of `packages/shared-types/src/user.ts`.**

  ```ts
  export const RefreshRequestSchema = z.object({
    refreshToken: z.string().min(32),
  });
  export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

  export const RefreshResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
  });
  export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

  export const LogoutResponseSchema = z.object({ ok: z.literal(true) });
  export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
  ```

- [ ] **9.2 — Verify barrel.** `packages/shared-types/src/index.ts` already does `export * from './user.js';` — no change needed. Confirm by grepping:

  ```bash
  grep -n "RefreshRequest" packages/shared-types/src/index.ts || echo "transitive via user.js — OK"
  ```

- [ ] **9.3 — Typecheck.** `pnpm --filter @knot/shared-types typecheck`. Expected: clean.

- [ ] **9.4 — Commit.**

  ```bash
  git add packages/shared-types/src/user.ts
  git commit -m "feat(shared-types): add Refresh and Logout schemas"
  ```

---

## Task 10 — Auth service (signup)

**Files:**
- Create: `apps/api/src/modules/auth/services/auth.service.ts`
- Test: `apps/api/test/unit/auth.service.test.ts`

- [ ] **10.1 — Failing test.**

  ```ts
  // apps/api/test/unit/auth.service.test.ts
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
  ```

- [ ] **10.2 — Run; FAIL.**

- [ ] **10.3 — Implement signup (rest of methods come in next tasks).**

  ```ts
  // apps/api/src/modules/auth/services/auth.service.ts
  import { config } from '../../../config/index.js';
  import { hashPassword, verifyPassword } from '../../../shared/crypto/password.js';
  import {
    issueAccessToken,
    mintRefreshToken,
    hashRefreshToken,
  } from '../../../shared/crypto/tokens.js';
  import { ConflictError, UnauthorizedError } from '../../../shared/errors.js';
  import type { UsersRepository, CreateUserInput } from '../repositories/users.repository.js';
  import type { SessionsRepository } from '../repositories/sessions.repository.js';
  import type { User } from '../../../shared/db/schema/users.js';

  export interface SignupInput {
    email: string;
    password: string;
    phone: string;
    firstName: string;
    dateOfBirth: string;
    gender: CreateUserInput['gender'];
    genderOtherLabel?: string;
    locale: 'es' | 'en' | 'pt-BR';
  }

  export interface RequestContext {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    deviceName?: string;
  }

  export interface AuthTokens {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }

  export class AuthService {
    constructor(
      private readonly users: UsersRepository,
      private readonly sessions: SessionsRepository,
    ) {}

    async signup(input: SignupInput, ctx: RequestContext): Promise<AuthTokens> {
      const existing = await this.users.findByEmail(input.email);
      if (existing) throw new ConflictError('auth.email_in_use', 'Email already registered');

      const passwordHash = await hashPassword(input.password);
      const user = await this.users.create({
        email: input.email,
        phone: input.phone,
        passwordHash,
        firstName: input.firstName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        genderOtherLabel: input.genderOtherLabel ?? null,
        locale: input.locale,
      });
      return this.issueSession(user, ctx);
    }

    private async issueSession(user: User, ctx: RequestContext): Promise<AuthTokens> {
      const refreshToken = mintRefreshToken();
      const session = await this.sessions.create({
        userId: user.id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        deviceId: ctx.deviceId ?? null,
        deviceName: ctx.deviceName ?? null,
        userAgent: ctx.userAgent ?? null,
        ipAddress: ctx.ipAddress ?? null,
        expiresAt: new Date(Date.now() + config.auth.refreshTtlDays * 24 * 60 * 60 * 1000),
      });
      const accessToken = await issueAccessToken({ userId: user.id, sessionId: session.id });
      return {
        user,
        accessToken,
        refreshToken,
        expiresIn: config.auth.accessTtlSeconds,
      };
    }
  }
  ```

- [ ] **10.4 — Run; PASS.** `pnpm --filter @knot/api test auth.service`.

- [ ] **10.5 — Commit.**

  ```bash
  git add apps/api/src/modules/auth/services/auth.service.ts apps/api/test/unit/auth.service.test.ts
  git commit -m "feat(api): AuthService.signup with session issuance"
  ```

---

## Task 11 — Auth service (login)

**Files:**
- Modify: `apps/api/src/modules/auth/services/auth.service.ts`
- Modify: `apps/api/test/unit/auth.service.test.ts`

- [ ] **11.1 — Append failing tests to `auth.service.test.ts`.**

  ```ts
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
  ```

- [ ] **11.2 — Run; FAIL.**

- [ ] **11.3 — Add `login` to `AuthService`.**

  ```ts
  // append inside AuthService class
  async login(
    input: { email: string; password: string; deviceId?: string; deviceName?: string },
    ctx: RequestContext,
  ): Promise<AuthTokens> {
    const user = await this.users.findByEmail(input.email);
    const ok = user && (await verifyPassword(input.password, user.passwordHash));
    if (!user || !ok) {
      throw new UnauthorizedError('auth.invalid_credentials', 'Invalid email or password');
    }
    return this.issueSession(user, {
      ...ctx,
      deviceId: input.deviceId ?? ctx.deviceId,
      deviceName: input.deviceName ?? ctx.deviceName,
    });
  }
  ```

- [ ] **11.4 — Run; PASS.**

- [ ] **11.5 — Commit.**

  ```bash
  git commit -am "feat(api): AuthService.login with constant error code"
  ```

---

## Task 12 — Auth service (refresh + logout)

**Files:**
- Modify: `apps/api/src/modules/auth/services/auth.service.ts`
- Modify: `apps/api/test/unit/auth.service.test.ts`

- [ ] **12.1 — Append tests.**

  ```ts
  describe('AuthService.refresh', () => {
    it('rotates refresh token and revokes the old session', async () => {
      const initial = await svc.signup(validSignup, {});
      const next = await svc.refresh({ refreshToken: initial.refreshToken }, {});
      expect(next.refreshToken).not.toBe(initial.refreshToken);
      // Old token now invalid:
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
  ```

- [ ] **12.2 — Run; FAIL.**

- [ ] **12.3 — Implement refresh + logout.**

  ```ts
  // append inside AuthService
  async refresh(
    input: { refreshToken: string },
    ctx: RequestContext,
  ): Promise<AuthTokens> {
    const hash = hashRefreshToken(input.refreshToken);
    const session = await this.sessions.findActiveByHash(hash);
    if (!session) throw new UnauthorizedError('auth.refresh_invalid', 'Refresh token invalid or expired');

    const user = await this.users.findById(session.userId);
    if (!user) throw new UnauthorizedError('auth.refresh_invalid', 'Refresh token invalid or expired');

    // Rotate: revoke old, mint new.
    await this.sessions.revoke(session.id);
    return this.issueSession(user, ctx);
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = hashRefreshToken(refreshToken);
    const session = await this.sessions.findActiveByHash(hash);
    if (!session) return;
    await this.sessions.revoke(session.id);
  }
  ```

- [ ] **12.4 — Run; PASS.**

- [ ] **12.5 — Commit.**

  ```bash
  git commit -am "feat(api): AuthService refresh (rotation) + logout (idempotent)"
  ```

---

## Task 13 — Module schemas + controller + plugin

**Files:**
- Create: `apps/api/src/modules/auth/schemas.ts`
- Create: `apps/api/src/modules/auth/controllers/auth.controller.ts`
- Create: `apps/api/src/modules/auth/index.ts`

- [ ] **13.1 — `schemas.ts`.**

  ```ts
  // apps/api/src/modules/auth/schemas.ts
  import { z } from 'zod';
  import {
    SignupRequestSchema,
    LoginRequestSchema,
    AuthResponseSchema,
    RefreshRequestSchema,
    RefreshResponseSchema,
    LogoutResponseSchema,
  } from '@knot/shared-types';

  export const Schemas = {
    Signup: { body: SignupRequestSchema, response: AuthResponseSchema },
    Login: { body: LoginRequestSchema, response: AuthResponseSchema },
    Refresh: { body: RefreshRequestSchema, response: RefreshResponseSchema },
    Logout: { body: RefreshRequestSchema, response: LogoutResponseSchema },
  };

  export type SignupBody = z.infer<typeof SignupRequestSchema>;
  export type LoginBody = z.infer<typeof LoginRequestSchema>;
  export type RefreshBody = z.infer<typeof RefreshRequestSchema>;
  ```

- [ ] **13.2 — `auth.controller.ts`.**

  ```ts
  // apps/api/src/modules/auth/controllers/auth.controller.ts
  import type { FastifyInstance, FastifyRequest } from 'fastify';
  import { ZodError } from 'zod';
  import { Schemas } from '../schemas.js';
  import { ValidationError } from '../../../shared/errors.js';
  import type { AuthService } from '../services/auth.service.js';
  import type { User } from '../../../shared/db/schema/users.js';

  function ctxFromReq(req: FastifyRequest) {
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] ?? undefined,
    };
  }

  function publicUser(u: User) {
    const { passwordHash, ...rest } = u;
    void passwordHash;
    return {
      ...rest,
      dateOfBirth: rest.dateOfBirth,
      emailVerifiedAt: rest.emailVerifiedAt?.toISOString() ?? null,
      phoneVerifiedAt: rest.phoneVerifiedAt?.toISOString() ?? null,
      identityVerifiedAt: rest.identityVerifiedAt?.toISOString() ?? null,
      createdAt: rest.createdAt.toISOString(),
    };
  }

  function parse<T>(schema: { parse: (x: unknown) => T }, body: unknown): T {
    try { return schema.parse(body); }
    catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError('common.validation_failed', 'Invalid request body', { issues: err.issues });
      }
      throw err;
    }
  }

  export function registerAuthRoutes(app: FastifyInstance, svc: AuthService) {
    app.post('/signup', async (req, reply) => {
      const body = parse(Schemas.Signup.body, req.body);
      const out = await svc.signup(body, ctxFromReq(req));
      reply.code(201);
      return { user: publicUser(out.user), accessToken: out.accessToken, refreshToken: out.refreshToken, expiresIn: out.expiresIn };
    });

    app.post('/login', async (req) => {
      const body = parse(Schemas.Login.body, req.body);
      const out = await svc.login(body, ctxFromReq(req));
      return { user: publicUser(out.user), accessToken: out.accessToken, refreshToken: out.refreshToken, expiresIn: out.expiresIn };
    });

    app.post('/refresh', async (req) => {
      const body = parse(Schemas.Refresh.body, req.body);
      const out = await svc.refresh(body, ctxFromReq(req));
      return { accessToken: out.accessToken, refreshToken: out.refreshToken, expiresIn: out.expiresIn };
    });

    app.post('/logout', async (req) => {
      const body = parse(Schemas.Logout.body, req.body);
      await svc.logout(body.refreshToken);
      return { ok: true as const };
    });
  }
  ```

- [ ] **13.3 — `index.ts` (plugin barrel).**

  ```ts
  // apps/api/src/modules/auth/index.ts
  import type { FastifyInstance } from 'fastify';
  import { db } from '../../shared/db/client.js';
  import { UsersRepository } from './repositories/users.repository.js';
  import { SessionsRepository } from './repositories/sessions.repository.js';
  import { AuthService } from './services/auth.service.js';
  import { registerAuthRoutes } from './controllers/auth.controller.js';

  export async function authModule(app: FastifyInstance) {
    const svc = new AuthService(new UsersRepository(db), new SessionsRepository(db));
    registerAuthRoutes(app, svc);
  }
  ```

- [ ] **13.4 — Typecheck.** `pnpm --filter @knot/api typecheck`. Expected: clean.

- [ ] **13.5 — Commit.**

  ```bash
  git add apps/api/src/modules/auth
  git commit -m "feat(api): wire auth module — schemas, controller, plugin"
  ```

---

## Task 14 — Error handler plugin + register auth in app

**Files:**
- Create: `apps/api/src/plugins/error-handler.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **14.1 — `error-handler.ts`.**

  ```ts
  // apps/api/src/plugins/error-handler.ts
  import type { FastifyInstance } from 'fastify';
  import { AppError } from '../shared/errors.js';

  export function registerErrorHandler(app: FastifyInstance) {
    app.setErrorHandler((err, req, reply) => {
      if (err instanceof AppError) {
        reply.code(err.statusCode).send({
          error: { code: err.code, message: err.message, details: err.details ?? undefined },
        });
        return;
      }
      // Fastify validation / unknown
      const status = err.statusCode ?? 500;
      if (status >= 500) req.log.error({ err }, 'unhandled error');
      reply.code(status).send({
        error: {
          code: status === 400 ? 'common.bad_request' : 'common.internal_error',
          message: status >= 500 ? 'Internal server error' : err.message,
        },
      });
    });
  }
  ```

- [ ] **14.2 — Patch `apps/api/src/app.ts`.** Replace the body so it imports both new pieces; full file:

  ```ts
  // apps/api/src/app.ts
  import Fastify, { FastifyInstance } from 'fastify';
  import cors from '@fastify/cors';
  import helmet from '@fastify/helmet';
  import sensible from '@fastify/sensible';
  import multipart from '@fastify/multipart';
  import rateLimit from '@fastify/rate-limit';
  import websocket from '@fastify/websocket';
  import { config } from './config/index.js';
  import { registerErrorHandler } from './plugins/error-handler.js';
  import { authModule } from './modules/auth/index.js';

  export async function buildServer(): Promise<FastifyInstance> {
    const server = Fastify({
      logger: {
        level: config.logLevel,
        transport: config.nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
      },
      trustProxy: true,
    });

    await server.register(helmet);
    await server.register(cors, { origin: config.allowedOrigins, credentials: true });
    await server.register(sensible);
    await server.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
    await server.register(rateLimit, { max: 100, timeWindow: '1 minute' });
    await server.register(websocket);

    registerErrorHandler(server);

    server.get('/health', async () => ({ status: 'ok' }));
    await server.register(authModule, { prefix: '/v1/auth' });

    return server;
  }
  ```

- [ ] **14.3 — Typecheck.** `pnpm --filter @knot/api typecheck` clean.

- [ ] **14.4 — Commit.**

  ```bash
  git add apps/api/src/plugins/error-handler.ts apps/api/src/app.ts
  git commit -m "feat(api): central error handler + register /v1/auth"
  ```

---

## Task 15 — Integration tests (full HTTP flow)

**Files:**
- Create: `apps/api/test/integration/auth.test.ts`

- [ ] **15.1 — Write the integration spec.**

  ```ts
  // apps/api/test/integration/auth.test.ts
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

      // Reusing the original now fails:
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
  ```

- [ ] **15.2 — Run; expect green.**

  ```bash
  pnpm --filter @knot/api test integration
  ```

- [ ] **15.3 — Commit.**

  ```bash
  git add apps/api/test/integration/auth.test.ts
  git commit -m "test(api): integration tests for /v1/auth"
  ```

---

## Task 16 — CI parity

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **16.1 — Add Postgres + Redis services + migrate step.** Replace the `check` job's `runs-on:` block contents (keep existing checkout/setup) with:

  ```yaml
  jobs:
    check:
      runs-on: ubuntu-latest
      services:
        postgres:
          image: pgvector/pgvector:pg16
          env:
            POSTGRES_USER: knot
            POSTGRES_PASSWORD: knot
            POSTGRES_DB: knot_test
          ports: ['5432:5432']
          options: >-
            --health-cmd "pg_isready -U knot"
            --health-interval 5s
            --health-timeout 3s
            --health-retries 10
        redis:
          image: redis:7-alpine
          ports: ['6379:6379']
          options: >-
            --health-cmd "redis-cli ping"
            --health-interval 5s
            --health-timeout 3s
            --health-retries 10
      env:
        DATABASE_URL: postgres://knot:knot@localhost:5432/knot_test
        REDIS_URL: redis://localhost:6379
        JWT_ACCESS_SECRET: test_test_test_test_test_test_test_test_test_test_test_test_test_test
        JWT_REFRESH_SECRET: test_test_test_test_test_test_test_test_test_test_test_test_test_test
        PASSWORD_PEPPER: test_test_test_test_test_test_test_test
        ENCRYPTION_KEY: test_test_test_test_test_test_test_test
        S3_ENDPOINT: http://localhost:9000
        S3_REGION: us-east-1
        S3_BUCKET: test
        S3_ACCESS_KEY_ID: test
        S3_SECRET_ACCESS_KEY: test
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
          with:
            version: 9
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: pnpm
        - run: pnpm install --frozen-lockfile
        - name: Init pgvector + extensions
          run: |
            psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
            psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"
            psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS cube;"
            psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS earthdistance;"
        - name: Migrate DB
          run: pnpm --filter @knot/api db:migrate
        - run: pnpm lint
        - run: pnpm typecheck
        - run: pnpm test
  ```

- [ ] **16.2 — Commit.**

  ```bash
  git add .github/workflows/ci.yml
  git commit -m "ci: add postgres+redis services, run migrations before tests"
  ```

---

## Task 17 — Final verification

- [ ] **17.1 — Local full pipeline.**

  ```bash
  pnpm --filter @knot/api typecheck
  pnpm --filter @knot/api test
  ```

  Both must pass.

- [ ] **17.2 — Smoke test the running API.**

  ```bash
  pnpm --filter @knot/api dev &
  sleep 3
  curl -s http://localhost:4000/health
  # → {"status":"ok"}
  curl -s -X POST http://localhost:4000/v1/auth/signup \
    -H 'content-type: application/json' \
    -d '{"email":"smoke@knot.app","password":"CorrectHorseBatteryStaple","phone":"+56911111111","firstName":"Smoke","dateOfBirth":"1990-01-15","gender":"male","locale":"es"}'
  # → 201 with user + tokens
  kill %1
  ```

- [ ] **17.3 — Push branch + open PR.** Confirm CI green.

- [ ] **17.4 — Update `docs/decision-log.md` (only if a new architectural choice was introduced).** This plan doesn't introduce new ADRs (uses choices already in 1, 2, 5). Skip this step unless something changed.

---

## Out of scope (next plans)

- Phone verification (Twilio) → Plan #2.
- `GET/PATCH/DELETE /me`, `me/apps/:app/{enable,pause}`, `me/preferences` → small follow-up plan or fold into #2.
- Authenticated request middleware (parse Bearer JWT, attach `req.user`) → first task of Plan #2 (needed before any `/me` route).
- Identity verification (Onfido), photo uploads, S3 → Plan #3.

---

## Self-review notes

- **Spec coverage:** Plan covers signup, login, refresh, logout per `docs/api-contract.md` §Autenticación. Phone verification deferred — flagged above.
- **Type consistency:** `AuthTokens.user` returned at every entry point; controller flattens to `{ user, accessToken, refreshToken, expiresIn }` matching `AuthResponseSchema`. `RefreshResponse` deliberately omits `user` per spec.
- **Security checks:** Password pepper applied via Argon2 `secret` option (binary). Refresh tokens are 256-bit random, only their SHA-256 stored. Login returns identical error code/message for unknown email and wrong password (no enumeration). Logout is idempotent (no info leak).
- **Test coverage:** crypto (unit), repos (Postgres-backed), service (Postgres-backed), routes (Fastify `inject`). CI runs `pgvector/pg16` to mirror prod schema.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-04-26-auth-module.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Fresh subagent per task, two-stage review between tasks, fast iteration. Use `superpowers:subagent-driven-development`.

**2. Inline Execution** — Execute tasks in this session with checkpoints for human review. Use `superpowers:executing-plans`.
