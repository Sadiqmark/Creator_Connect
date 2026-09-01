import { Request, Response } from 'express';
import { ApiErrorResponse } from '@creator-connect/shared';

export const notFoundHandler = (req: Request, res: Response): void => {
  const errorPayload: ApiErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `The requested resource '${req.method} ${req.originalUrl}' was not found.`,
      requestId: req.id ? String(req.id) : undefined,
    },
  };

  res.status(404).json(errorPayload);
};
