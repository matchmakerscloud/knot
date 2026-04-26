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
