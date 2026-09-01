import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '@creator-connect/shared';
import { logger } from './logger';
import { env } from '../config/env';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.id ? String(req.id) : 'unknown-req-id';
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const errorCode = err instanceof AppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message =
    statusCode === 500 && env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Something went wrong';

  logger.error(
    {
      requestId,
      statusCode,
      errorCode,
      err: {
        message: err.message,
        stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
      },
    },
    `Request error: ${err.message}`
  );

  const errorPayload: ApiErrorResponse = {
    error: {
      code: errorCode,
      message,
      requestId,
      ...(err instanceof AppError && err.details ? { details: err.details } : {}),
    },
  };

  res.status(statusCode).json(errorPayload);
};
