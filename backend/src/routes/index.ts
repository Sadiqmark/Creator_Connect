import { Router } from 'express';
import { healthRouter } from './health.router';
import { authRouter } from './auth.router';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);

