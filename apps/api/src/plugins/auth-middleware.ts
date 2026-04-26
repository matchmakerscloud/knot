import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../shared/crypto/tokens.js';
import { UnauthorizedError } from '../shared/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: { userId: string; sessionId: string };
  }
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export function registerAuthMiddleware(app: FastifyInstance) {
  app.decorate('requireAuth', async function requireAuth(req: FastifyRequest, _reply: FastifyReply) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('auth.missing_bearer', 'Missing Bearer token');
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      const claims = await verifyAccessToken(token);
      req.auth = { userId: claims.userId, sessionId: claims.sessionId };
    } catch {
      throw new UnauthorizedError('auth.invalid_token', 'Invalid or expired token');
    }
  });
}
