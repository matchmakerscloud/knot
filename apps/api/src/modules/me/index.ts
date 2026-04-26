import type { FastifyInstance } from 'fastify';
import { db } from '../../shared/db/client.js';
import { UsersRepository } from '../auth/repositories/users.repository.js';
import { NotFoundError } from '../../shared/errors.js';
import type { User } from '../../shared/db/schema/users.js';

function publicUser(u: User) {
  const { passwordHash, ...rest } = u;
  void passwordHash;
  return {
    ...rest,
    emailVerifiedAt: rest.emailVerifiedAt?.toISOString() ?? null,
    phoneVerifiedAt: rest.phoneVerifiedAt?.toISOString() ?? null,
    identityVerifiedAt: rest.identityVerifiedAt?.toISOString() ?? null,
    lastActiveAt: rest.lastActiveAt?.toISOString() ?? null,
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
    deletedAt: rest.deletedAt?.toISOString() ?? null,
  };
}

export async function meModule(app: FastifyInstance) {
  const users = new UsersRepository(db);

  app.get('/', { preHandler: app.requireAuth }, async (req) => {
    const userId = req.auth!.userId;
    const u = await users.findById(userId);
    if (!u) throw new NotFoundError('user.not_found', 'User no longer exists');
    return { user: publicUser(u) };
  });
}
