import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { config } from './config/index.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerAuthMiddleware } from './plugins/auth-middleware.js';
import { authModule } from './modules/auth/index.js';
import { meModule } from './modules/me/index.js';
import { waitlistModule } from './modules/waitlist/index.js';
import { uploadsModule } from './modules/uploads/index.js';

export async function buildServer(): Promise<FastifyInstance> {
  const fastifyOpts = {
    logger: {
      level: config.logLevel,
      ...(config.nodeEnv === 'development'
        ? { transport: { target: 'pino-pretty' } }
        : {}),
    },
    trustProxy: true,
  };
  const server: FastifyInstance = Fastify(fastifyOpts);

  // CORS first so its OPTIONS handler runs before helmet adds restrictive CORP headers
  await server.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (config.allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await server.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  await server.register(sensible);
  await server.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });
  await server.register(websocket);

  registerErrorHandler(server);
  registerAuthMiddleware(server);

  server.get('/health', async () => ({ status: 'ok' }));

  await server.register(authModule, { prefix: '/v1/auth' });
  await server.register(meModule, { prefix: '/v1/me' });
  await server.register(waitlistModule, { prefix: '/v1/waitlist' });
  await server.register(uploadsModule, { prefix: '/v1/uploads' });

  return server;
}
