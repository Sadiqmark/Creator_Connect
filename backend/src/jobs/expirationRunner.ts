import { expireInquiries } from '../services/inquiry.service';
import {
  sweepPermanentDeletions,
  sweepFirebaseDeletions,
  sweepExpiredEmailReservations,
} from '../services/deletion.service';
import { logger } from '../middleware/logger';

let runnerTimer: NodeJS.Timeout | null = null;
let isRunning = false;

export type LifecycleSweepResult = {
  inquiriesExpired: number;
  permanentDeletionsProcessed: number;
  firebaseDeletionsProcessed: number;
  firebaseDeletionsSuccess: number;
  firebaseDeletionsFailed: number;
  emailReservationsCleaned: number;
};

/**
 * Executes a single unified lifecycle sweep across all 4 periodic maintenance tasks:
 * 1. Inquiry Expiration (transitions stale PENDING inquiries to EXPIRED)
 * 2. Permanent Deletion (processes DEACTIVATED users past 30-day grace period)
 * 3. Firebase Deletion Queue (claims and processes pending Firebase account deletions)
 * 4. Email Reservation Release (cleans up expired reservation rows)
 *
 * Each task is executed in isolation: an unexpected error in one sweep is caught
 * and logged without failing the remaining sweeps.
 */
export async function runLifecycleSweep(): Promise<LifecycleSweepResult> {
  if (isRunning) {
    logger.debug('Lifecycle sweep is already in progress. Skipping tick.');
    return {
      inquiriesExpired: 0,
      permanentDeletionsProcessed: 0,
      firebaseDeletionsProcessed: 0,
      firebaseDeletionsSuccess: 0,
      firebaseDeletionsFailed: 0,
      emailReservationsCleaned: 0,
    };
  }

  isRunning = true;
  const result: LifecycleSweepResult = {
    inquiriesExpired: 0,
    permanentDeletionsProcessed: 0,
    firebaseDeletionsProcessed: 0,
    firebaseDeletionsSuccess: 0,
    firebaseDeletionsFailed: 0,
    emailReservationsCleaned: 0,
  };

  try {
    // 1. Inquiry Expiration Sweep
    try {
      const { expiredCount } = await expireInquiries();
      result.inquiriesExpired = expiredCount;
      if (expiredCount > 0) {
        logger.info({ expiredCount }, 'Inquiry expiration sweep completed');
      }
    } catch (err: any) {
      logger.error(
        { error: err.message, stack: err.stack },
        'Inquiry expiration sweep encountered an error'
      );
    }

    // 2. Permanent Deletion Sweep
    try {
      const { processedCount } = await sweepPermanentDeletions();
      result.permanentDeletionsProcessed = processedCount;
      if (processedCount > 0) {
        logger.info({ processedCount }, 'Permanent deletion sweep completed');
      }
    } catch (err: any) {
      logger.error(
        { error: err.message, stack: err.stack },
        'Permanent deletion sweep encountered an error'
      );
    }

    // 3. Firebase Deletion Queue Sweep
    try {
      const fbResult = await sweepFirebaseDeletions();
      result.firebaseDeletionsProcessed = fbResult.processedCount;
      result.firebaseDeletionsSuccess = fbResult.successCount;
      result.firebaseDeletionsFailed = fbResult.failedCount;
      if (fbResult.processedCount > 0) {
        logger.info(fbResult, 'Firebase deletion queue sweep completed');
      }
    } catch (err: any) {
      logger.error(
        { error: err.message, stack: err.stack },
        'Firebase deletion queue sweep encountered an error'
      );
    }

    // 4. Expired Email Reservations Sweep
    try {
      const { deletedCount } = await sweepExpiredEmailReservations();
      result.emailReservationsCleaned = deletedCount;
      if (deletedCount > 0) {
        logger.info({ deletedCount }, 'Expired email reservations sweep completed');
      }
    } catch (err: any) {
      logger.error(
        { error: err.message, stack: err.stack },
        'Expired email reservations sweep encountered an error'
      );
    }

    return result;
  } finally {
    isRunning = false;
  }
}

/**
 * Starts the in-process unified lifecycle runner.
 * Executes an immediate startup sweep, followed by a recurring interval (default: 15 minutes).
 * The timer is unref'd so it does not prevent graceful Node.js shutdown.
 */
export function startLifecycleRunner(intervalMs = 15 * 60 * 1000): void {
  if (runnerTimer) {
    logger.warn('Lifecycle runner is already running.');
    return;
  }

  // 1. Immediate startup sweep
  runLifecycleSweep().catch((err) => {
    logger.error({ err: err.message }, 'Failed during initial startup lifecycle sweep');
  });

  // 2. Recurring periodic sweep
  runnerTimer = setInterval(() => {
    runLifecycleSweep().catch((err) => {
      logger.error({ err: err.message }, 'Failed during periodic lifecycle sweep');
    });
  }, intervalMs);

  // Unref timer so Node process can exit cleanly without waiting for this interval
  if (runnerTimer && typeof runnerTimer.unref === 'function') {
    runnerTimer.unref();
  }

  logger.info({ intervalMs }, 'Unified lifecycle runner initialized');
}

/**
 * Stops the lifecycle runner (used primarily for test cleanup and graceful shutdown).
 */
export function stopLifecycleRunner(): void {
  if (runnerTimer) {
    clearInterval(runnerTimer);
    runnerTimer = null;
    isRunning = false;
    logger.info('Unified lifecycle runner stopped');
  }
}

// ─── Backward-Compatibility Exports for Phase 12 Tests & Server ───────────────

/**
 * @deprecated Use runLifecycleSweep() instead. Maintained for Phase 12 test suite compatibility.
 */
export async function runExpirationSweep(): Promise<number> {
  const result = await runLifecycleSweep();
  return result.inquiriesExpired;
}

/**
 * @deprecated Use startLifecycleRunner() instead. Maintained for server & test compatibility.
 */
export function startInquiryExpirationRunner(intervalMs = 15 * 60 * 1000): void {
  startLifecycleRunner(intervalMs);
}

/**
 * @deprecated Use stopLifecycleRunner() instead. Maintained for server & test compatibility.
 */
export function stopInquiryExpirationRunner(): void {
  stopLifecycleRunner();
}
