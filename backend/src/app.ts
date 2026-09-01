import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestIdMiddleware } from './middleware/requestId';
import { httpLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { apiRouter } from './routes';

export const createApp = (): Express => {
  const app = express();

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  // Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Correlation & Logging
  app.use(requestIdMiddleware);
  app.use(httpLogger);

  // API v1 Routing
  app.use('/api/v1', apiRouter);

  // Unmatched Routes & Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();

