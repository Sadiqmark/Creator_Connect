import { describe, it, expect } from 'vitest';
import {
  AppApiError,
  normalizeApiError,
  isApiError,
  isConflictError,
  isAuthError,
  isForbiddenError,
  isNotFoundError,
} from '../services/api/errors';

describe('API Error Normalization & Model Contract', () => {
  it('instantiates AppApiError with standard properties and backward-compatible response', () => {
    const err = new AppApiError({
      message: 'Resource conflict occurred',
      code: 'INVALID_INQUIRY_STATE',
      statusCode: 409,
      requestId: 'req-test-123',
      details: { field: 'status' },
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppApiError);
    expect(err.name).toBe('AppApiError');
    expect(err.message).toBe('Resource conflict occurred');
    expect(err.code).toBe('INVALID_INQUIRY_STATE');
    expect(err.statusCode).toBe(409);
    expect(err.requestId).toBe('req-test-123');
    expect(err.details).toEqual({ field: 'status' });

    // Backward-compatible Axios response shape
    expect(err.response).toBeDefined();
    expect(err.response.status).toBe(409);
    expect(err.response.data.error.code).toBe('INVALID_INQUIRY_STATE');
    expect(err.response.data.error.message).toBe('Resource conflict occurred');
    expect(err.response.data.error.requestId).toBe('req-test-123');
  });

  it('normalizes Axios-shaped backend error envelope into AppApiError', () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed with status code 409',
      response: {
        status: 409,
        data: {
          error: {
            code: 'INVALID_INQUIRY_STATE',
            message: 'Inquiry is no longer pending.',
            requestId: 'req-409-abc',
          },
        },
      },
    };

    const normalized = normalizeApiError(axiosError);

    expect(normalized).toBeInstanceOf(AppApiError);
    expect(normalized.statusCode).toBe(409);
    expect(normalized.code).toBe('INVALID_INQUIRY_STATE');
    expect(normalized.message).toBe('Inquiry is no longer pending.');
    expect(normalized.requestId).toBe('req-409-abc');
    // Backward compatibility check
    expect(normalized.response?.status).toBe(409);
    expect(normalized.response?.data?.error?.code).toBe('INVALID_INQUIRY_STATE');
  });

  it('normalizes network interruption or missing backend envelope gracefully', () => {
    const networkError = new Error('Network Error');

    const normalized = normalizeApiError(networkError);

    expect(normalized).toBeInstanceOf(AppApiError);
    expect(normalized.statusCode).toBe(500);
    expect(normalized.code).toBe('INTERNAL_SERVER_ERROR');
    expect(normalized.message).toBe('Network Error');
  });

  it('returns same instance if error is already an AppApiError', () => {
    const original = new AppApiError({
      message: 'Already normalized',
      code: 'ALREADY_NORMALIZED',
      statusCode: 400,
    });

    const normalized = normalizeApiError(original);
    expect(normalized).toBe(original);
  });

  describe('Type guards & error classification helpers', () => {
    it('identifies AppApiError with isApiError', () => {
      const err = new AppApiError({
        message: 'Bad Request',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
      });

      expect(isApiError(err)).toBe(true);
      expect(isApiError(new Error('plain error'))).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError('string')).toBe(false);
    });

    it('identifies conflict errors with isConflictError', () => {
      const conflictAppError = new AppApiError({
        message: 'Conflict',
        code: 'INVALID_INQUIRY_STATE',
        statusCode: 409,
      });

      expect(isConflictError(conflictAppError)).toBe(true);
      expect(isConflictError({ statusCode: 409, code: 'CONFLICT' })).toBe(true);
      expect(isConflictError({ response: { status: 409 } })).toBe(true);
      expect(isConflictError({ code: 'DUPLICATE_ACTIVE_INQUIRY' })).toBe(true);
      expect(isConflictError({ statusCode: 400, code: 'VALIDATION_ERROR' })).toBe(false);
    });

    it('identifies authentication errors with isAuthError', () => {
      expect(isAuthError({ statusCode: 401 })).toBe(true);
      expect(isAuthError({ response: { status: 401 } })).toBe(true);
      expect(isAuthError({ code: 'TOKEN_EXPIRED' })).toBe(true);
      expect(isAuthError({ statusCode: 403 })).toBe(false);
    });

    it('identifies forbidden errors with isForbiddenError', () => {
      expect(isForbiddenError({ statusCode: 403 })).toBe(true);
      expect(isForbiddenError({ code: 'ACCOUNT_DEACTIVATED' })).toBe(true);
      expect(isForbiddenError({ code: 'ROLE_NOT_PERMITTED' })).toBe(true);
      expect(isForbiddenError({ statusCode: 401 })).toBe(false);
    });

    it('identifies not found errors with isNotFoundError', () => {
      expect(isNotFoundError({ statusCode: 404 })).toBe(true);
      expect(isNotFoundError({ code: 'CREATOR_NOT_FOUND' })).toBe(true);
      expect(isNotFoundError({ code: 'INQUIRY_NOT_FOUND' })).toBe(true);
      expect(isNotFoundError({ statusCode: 500 })).toBe(false);
    });
  });
});
