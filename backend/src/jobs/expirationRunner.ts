import { expireInquiries } from '../services/inquiry.service';
import { logger } from '../middleware/logger';

let runnerTimer: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Executes a single sweep of expiring stale inquiries.
 * Catches and logs any unexpected error without allowing it to propagate or crash the process.
 */
export async function runExpirationSweep(): Promise<number> {
  if (isRunning) {
    logger.debug('Inquiry expiration sweep is already in progress. Skipping tick.');
    return 0;
  }

  isRunning = true;
  try {
    const { expiredCount } = await expireInquiries();
    if (expiredCount > 0) {
      logger.info({ expiredCount }, 'Inquiry expiration sweep completed successfully');
    }
    return expiredCount;
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack },
      'Inquiry expiration sweep encountered an error'
    );
    return 0;
  } finally {
    isRunning = false;
  }
}

/**
 * Starts the in-process inquiry expiration runner.
 * Executes an immediate startup sweep, followed by a recurring interval (default: 15 minutes).
 * The timer is unref'd so it does not prevent graceful Node.js shutdown.
 */
export function startInquiryExpirationRunner(intervalMs = 15 * 60 * 1000): void {
  if (runnerTimer) {
    logger.warn('Inquiry expiration runner is already running.');
    return;
  }

  // 1. Immediate startup sweep
  runExpirationSweep().catch((err) => {
    logger.error({ err: err.message }, 'Failed during initial startup expiration sweep');
  });

  // 2. Recurring periodic sweep
  runnerTimer = setInterval(() => {
    runExpirationSweep().catch((err) => {
      logger.error({ err: err.message }, 'Failed during periodic expiration sweep');
    });
  }, intervalMs);

  // Unref timer so Node process can exit cleanly without waiting for this interval
  if (runnerTimer && typeof runnerTimer.unref === 'function') {
    runnerTimer.unref();
  }

  logger.info({ intervalMs }, 'Inquiry expiration runner initialized');
}

/**
 * Stops the expiration runner (used primarily for test cleanup and graceful shutdown).
 */
export function stopInquiryExpirationRunner(): void {
  if (runnerTimer) {
    clearInterval(runnerTimer);
    runnerTimer = null;
    isRunning = false;
    logger.info('Inquiry expiration runner stopped');
  }
}
