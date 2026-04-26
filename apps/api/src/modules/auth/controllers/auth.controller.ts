import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ZodError, type ZodType } from 'zod';
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
    emailVerifiedAt: rest.emailVerifiedAt?.toISOString() ?? null,
    phoneVerifiedAt: rest.phoneVerifiedAt?.toISOString() ?? null,
    identityVerifiedAt: rest.identityVerifiedAt?.toISOString() ?? null,
    createdAt: rest.createdAt.toISOString(),
  };
}

function parse<T>(schema: ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (err) {
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
    return {
      user: publicUser(out.user),
      accessToken: out.accessToken,
      refreshToken: out.refreshToken,
      expiresIn: out.expiresIn,
    };
  });

  app.post('/login', async (req) => {
    const body = parse(Schemas.Login.body, req.body);
    const out = await svc.login(body, ctxFromReq(req));
    return {
      user: publicUser(out.user),
      accessToken: out.accessToken,
      refreshToken: out.refreshToken,
      expiresIn: out.expiresIn,
    };
  });

  app.post('/refresh', async (req) => {
    const body = parse(Schemas.Refresh.body, req.body);
    const out = await svc.refresh(body, ctxFromReq(req));
    return {
      accessToken: out.accessToken,
      refreshToken: out.refreshToken,
      expiresIn: out.expiresIn,
    };
  });

  app.post('/logout', async (req) => {
    const body = parse(Schemas.Logout.body, req.body);
    await svc.logout(body.refreshToken);
    return { ok: true as const };
  });
}
