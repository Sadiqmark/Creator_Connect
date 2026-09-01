import { Router, Request, Response } from 'express';
import { HealthCheckResponse } from '@creator-connect/shared';
import { env } from '../config/env';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const payload: HealthCheckResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    version: '1.0.0',
  };

  res.status(200).json(payload);
});
