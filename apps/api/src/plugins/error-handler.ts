import type { FastifyInstance, FastifyError } from 'fastify';
import { AppError } from '../shared/errors.js';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    if (err instanceof AppError) {
      reply.code(err.statusCode).send({
        error: { code: err.code, message: err.message, details: err.details ?? undefined },
      });
      return;
    }
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
