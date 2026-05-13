export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'BUSINESS_RULE_ERROR'
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_2FA_REQUIRED'
  | 'AUTH_OTP_INVALID'
  | 'AUTH_OTP_EXPIRED'
  | 'AUTH_ACCOUNT_LOCKED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_STOCK'
  | 'CART_RESERVATION_EXPIRED'
  | 'PAYMENT_FAILED'
  | 'TENANT_MISMATCH'
  | 'INTERNAL_ERROR'
  | 'EXTERNAL_SERVICE_ERROR';

export type BaseAppErrorOptions = {
  code: ErrorCode;
  message: string;
  httpStatus: number;
  details?: Record<string, unknown>;
  cause?: unknown;
};

export class BaseAppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown> | undefined;
  override readonly cause?: unknown;

  constructor(opts: BaseAppErrorOptions) {
    super(opts.message);
    this.name = this.constructor.name;
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
    if (opts.details !== undefined) this.details = opts.details;
    if (opts.cause !== undefined) this.cause = opts.cause;
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON(): { code: ErrorCode; message: string; details?: Record<string, unknown> } {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

function buildOpts(base: { code: ErrorCode; message: string; httpStatus: number }, details?: Record<string, unknown>): BaseAppErrorOptions {
  return details !== undefined ? { ...base, details } : base;
}

export class ValidationError extends BaseAppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(buildOpts({ code: 'VALIDATION_ERROR', message, httpStatus: 400 }, details));
  }
}

export class BusinessRuleError extends BaseAppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(buildOpts({ code: 'BUSINESS_RULE_ERROR', message, httpStatus: 422 }, details));
  }
}

export class AuthRequiredError extends BaseAppError {
  constructor(message = 'Authentication required') {
    super({ code: 'AUTH_REQUIRED', message, httpStatus: 401 });
  }
}

export class InvalidCredentialsError extends BaseAppError {
  constructor(message = 'Invalid email or password') {
    super({ code: 'AUTH_INVALID_CREDENTIALS', message, httpStatus: 401 });
  }
}

export class ForbiddenError extends BaseAppError {
  constructor(message = 'Forbidden') {
    super({ code: 'FORBIDDEN', message, httpStatus: 403 });
  }
}

export class NotFoundError extends BaseAppError {
  constructor(resource: string, identifier?: string) {
    super({
      code: 'NOT_FOUND',
      message: identifier ? `${resource} '${identifier}' not found` : `${resource} not found`,
      httpStatus: 404,
    });
  }
}

export class ConflictError extends BaseAppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(buildOpts({ code: 'CONFLICT', message, httpStatus: 409 }, details));
  }
}

export class RateLimitedError extends BaseAppError {
  constructor(retryAfterSec: number) {
    super({
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      httpStatus: 429,
      details: { retryAfterSec },
    });
  }
}

export class TenantMismatchError extends BaseAppError {
  constructor(message = 'Tenant scope violation') {
    super({ code: 'TENANT_MISMATCH', message, httpStatus: 403 });
  }
}

export class ExternalServiceError extends BaseAppError {
  constructor(service: string, cause?: unknown) {
    const base = {
      code: 'EXTERNAL_SERVICE_ERROR' as const,
      message: `External service failure: ${service}`,
      httpStatus: 502,
    };
    super(cause !== undefined ? { ...base, cause } : base);
  }
}
