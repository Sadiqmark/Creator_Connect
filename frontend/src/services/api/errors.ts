import type { ApiErrorResponse } from '@creator-connect/shared';

export interface AppApiErrorOptions {
  message: string;
  code: string;
  statusCode: number;
  requestId?: string;
  details?: unknown;
  rawError?: unknown;
}

/**
 * Normalized application API error contract.
 * Exposes standardized error properties (`message`, `code`, `statusCode`, `requestId`, `details`)
 * while maintaining a backward-compatible `response` object for Axios callers.
 */
export class AppApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly requestId?: string;
  public readonly details?: unknown;
  public readonly rawError?: unknown;

  /**
   * Backward-compatible response property matching the Axios shape
   * so legacy or transitional checks like `err.response?.status === 409` continue to work.
   */
  public readonly response: {
    status: number;
    data: ApiErrorResponse;
  };

  constructor(options: AppApiErrorOptions) {
    super(options.message);
    this.name = 'AppApiError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.requestId = options.requestId;
    this.details = options.details;
    this.rawError = options.rawError;

    this.response = {
      status: options.statusCode,
      data: {
        error: {
          code: options.code,
          message: options.message,
          requestId: options.requestId,
          details: options.details,
        },
      },
    };

    // Ensure correct prototype chain in transpiled TypeScript environments
    Object.setPrototypeOf(this, AppApiError.prototype);
  }
}

/**
 * Type guard checking if an unknown error satisfies the normalized API error contract.
 */
export function isApiError(error: unknown): error is AppApiError {
  if (!error || typeof error !== 'object') return false;
  return (
    error instanceof AppApiError ||
    ('statusCode' in error && 'code' in error && 'message' in error)
  );
}

/**
 * Checks if an error represents an HTTP 409 conflict or state transition failure.
 */
export function isConflictError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as any;
  return (
    err.statusCode === 409 ||
    err.response?.status === 409 ||
    err.code === 'INVALID_INQUIRY_STATE' ||
    err.code === 'DUPLICATE_ACTIVE_INQUIRY' ||
    err.code === 'CONFLICT' ||
    err.response?.data?.error?.code === 'INVALID_INQUIRY_STATE' ||
    err.response?.data?.error?.code === 'DUPLICATE_ACTIVE_INQUIRY'
  );
}

/**
 * Checks if an error represents an HTTP 401 unauthenticated error.
 */
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as any;
  return (
    err.statusCode === 401 ||
    err.response?.status === 401 ||
    err.code === 'UNAUTHORIZED' ||
    err.code === 'TOKEN_EXPIRED'
  );
}

/**
 * Checks if an error represents an HTTP 403 authorization denial.
 */
export function isForbiddenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as any;
  return (
    err.statusCode === 403 ||
    err.response?.status === 403 ||
    err.code === 'FORBIDDEN' ||
    err.code === 'ACCOUNT_DEACTIVATED' ||
    err.code === 'ROLE_NOT_PERMITTED'
  );
}

/**
 * Checks if an error represents an HTTP 404 missing resource.
 */
export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as any;
  return (
    err.statusCode === 404 ||
    err.response?.status === 404 ||
    err.code === 'NOT_FOUND' ||
    err.code === 'CREATOR_NOT_FOUND' ||
    err.code === 'INQUIRY_NOT_FOUND' ||
    err.code === 'USER_NOT_FOUND'
  );
}

/**
 * Converts any unknown error, Axios error, or backend error envelope into an AppApiError.
 */
export function normalizeApiError(error: any): AppApiError {
  if (error instanceof AppApiError) {
    return error;
  }

  // Extract from Axios error response or custom error object
  const backendError = error?.response?.data?.error;
  const statusCode: number =
    typeof error?.response?.status === 'number'
      ? error.response.status
      : typeof error?.statusCode === 'number'
      ? error.statusCode
      : 500;

  const code: string =
    backendError?.code ||
    error?.code ||
    (statusCode === 404
      ? 'NOT_FOUND'
      : statusCode === 409
      ? 'CONFLICT'
      : statusCode === 403
      ? 'FORBIDDEN'
      : statusCode === 401
      ? 'UNAUTHORIZED'
      : statusCode >= 500
      ? 'INTERNAL_SERVER_ERROR'
      : 'UNKNOWN_ERROR');

  const message: string =
    backendError?.message ||
    error?.message ||
    (statusCode >= 500
      ? 'A server error occurred. Please try again later.'
      : 'An unexpected error occurred.');

  const requestId: string | undefined = backendError?.requestId || error?.requestId;
  const details: unknown = backendError?.details || error?.details;

  return new AppApiError({
    message,
    code,
    statusCode,
    requestId,
    details,
    rawError: error,
  });
}
