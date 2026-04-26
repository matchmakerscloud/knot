export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = 'auth.unauthorized', message = 'Unauthorized', details?: Record<string, unknown>) {
    super(code, 401, message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(code = 'auth.forbidden', message = 'Forbidden') {
    super(code, 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(code = 'common.not_found', message = 'Not found') {
    super(code, 404, message);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, 409, message, details);
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, 400, message, details);
  }
}
