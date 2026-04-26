import { describe, it, expect } from 'vitest';
import { db } from '../../src/shared/db/client.js';
import { UsersRepository } from '../../src/modules/auth/repositories/users.repository.js';

const repo = new UsersRepository(db);

describe('UsersRepository', () => {
  it('creates and finds by email (case-insensitive)', async () => {
    const created = await repo.create({
      email: 'Mario@Example.com',
      phone: '+56911111111',
      passwordHash: 'hash',
      firstName: 'Mario',
      dateOfBirth: '1990-01-15',
      gender: 'male',
      genderOtherLabel: null,
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
      email: 'a@a.com',
      phone: '+56922222222',
      passwordHash: 'h',
      firstName: 'A',
      dateOfBirth: '1990-01-01',
      gender: 'female',
      genderOtherLabel: null,
      locale: 'es',
    });
    const got = await repo.findById(u.id);
    expect(got?.email).toBe('a@a.com');
  });
});
