import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { config } from './config/index.js';

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.nodeEnv === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
    },
    trustProxy: true,
  });

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

  server.get('/health', async () => ({ status: 'ok' }));

  // TODO: register module routes here
  // await server.register(authRoutes, { prefix: '/v1/auth' });
  // await server.register(usersRoutes, { prefix: '/v1/users' });
  // await server.register(voiceRoutes, { prefix: '/v1/voice' });
  // await server.register(wordsRoutes, { prefix: '/v1/words' });
  // await server.register(matchRoutes, { prefix: '/v1/match' });

  return server;
}
