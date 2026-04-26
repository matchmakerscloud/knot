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
