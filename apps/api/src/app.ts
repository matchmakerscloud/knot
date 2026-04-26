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

  await server.register(helmet);
  await server.register(cors, {
    origin: config.allowedOrigins,
    credentials: true,
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

  server.get('/health', async () => ({ status: 'ok' }));

  await server.register(authModule, { prefix: '/v1/auth' });

  return server;
}
