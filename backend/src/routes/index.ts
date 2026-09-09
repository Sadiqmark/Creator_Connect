import { Router } from 'express';
import { healthRouter } from './health.router';
import { authRouter } from './auth.router';
import { creatorRouter } from './creator.router';
import { businessRouter } from './business.router';
import { savedCreatorRouter } from './savedCreator.router';
import inquiryRouter from './inquiry.router';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/creators', creatorRouter);
apiRouter.use('/businesses', businessRouter);
apiRouter.use('/saved-creators', savedCreatorRouter);
apiRouter.use('/inquiries', inquiryRouter);

