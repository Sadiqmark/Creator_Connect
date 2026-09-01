import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../middleware/logger';

declare global {
  var __globalPrismaClient__: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
  });

  if (env.NODE_ENV === 'development') {
    // Log Prisma query events in debug mode
    (client as any).$on('query', (e: any) => {
      logger.debug({ query: e.query, params: e.params, duration: `${e.duration}ms` }, 'Prisma Query');
    });
  }

  (client as any).$on('error', (e: any) => {
    logger.error({ target: e.target, message: e.message }, 'Prisma Client Error');
  });

  return client;
};

export const prisma: PrismaClient = globalThis.__globalPrismaClient__ ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalThis.__globalPrismaClient__ = prisma;
}

export default prisma;
