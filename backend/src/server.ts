import { createApp } from './app';
import { env } from './config/env';
import { logger } from './middleware/logger';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      environment: env.NODE_ENV,
    },
    `🚀 Creator Connect Backend API listening on http://localhost:${env.PORT}`
  );
});

const gracefulShutdown = (signal: string) => {
  logger.info({ signal }, `Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    logger.info('HTTP server closed cleanly. Exiting process.');
    process.exit(0);
  });

  // Force close if graceful takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
