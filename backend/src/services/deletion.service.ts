import crypto from 'crypto';
import { InquiryStatus, AuditEventType } from '@prisma/client';
import prisma from '../database/prisma';
import { env } from '../config/env';
import { firebaseAdminAuth } from '../config/firebase';
import { logger } from '../middleware/logger';

/**
 * Canonicalizes an email address according to the application lifecycle standard:
 * 1. Strips leading and trailing whitespace.
 * 2. Converts to lowercase.
 * 3. Applies Unicode NFKC normalization (ensuring compatibility across equivalent character representations).
 *
 * Note: Provider-specific transformations (such as stripping dots or plus-addressing)
 * are intentionally NOT performed to avoid breaking valid email identities.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().normalize('NFKC');
}

/**
 * Normalizes and hashes an email for deterministic reservation storage using HMAC-SHA256.
 */
export function hashEmailForReservation(email: string): string {
  const normalized = normalizeEmail(email);
  return crypto
    .createHmac('sha256', env.EMAIL_RESERVATION_HMAC_SECRET)
    .update(normalized)
    .digest('hex');
}

/**
 * Derives a deterministic 64-bit signed integer (bigint) for PostgreSQL pg_advisory_xact_lock
 * keyed from the canonicalized email address.
 *
 * Coordination Primitive Notes:
 * - The lock key is an internal concurrency coordination primitive used solely to serialize
 *   competing transactions for the same email address; it is NOT a security credential.
 * - The derived integer is never exposed externally to clients.
 * - Uses SHA-256 with a domain-separated prefix (`cc:email_reservation_lock:`), taking the first 8 bytes as BigInt64BE.
 * - Practical collision probability is negligible at the expected application scale. In the theoretical event of
 *   a hash collision, unrelated transactions would merely serialize sequentially; no authorization or data leak occurs.
 */
export function getEmailReservationLockKey(email: string): bigint {
  const normalized = normalizeEmail(email);
  const digest = crypto
    .createHash('sha256')
    .update(`cc:email_reservation_lock:${normalized}`)
    .digest();
  return digest.readBigInt64BE(0);
}

export type PermanentDeletionResult = {
  deleted: boolean;
  reservationOutcome?: 'CREATED' | 'REPLACED_EXPIRED' | 'ALREADY_EXISTS_SAME_USER' | 'HISTORICAL_CONFLICT';
};

/**
 * Atomically permanently deletes a DEACTIVATED user whose 30-day grace period has expired.
 * Executed entirely inside a PostgreSQL transaction:
 * 1. Lock user with FOR UPDATE SKIP LOCKED
 * 2. Acquire transaction-level advisory lock keyed on normalized email
 * 3. Define single transaction timestamp: permanentDeletedAt
 * 4. Close active inquiries (PENDING/ACCEPTED -> CLOSED) with closedAt & INQUIRY_CLOSED audit events
 * 5. Anonymize profile data
 * 6. Create deterministic 180-day email reservation with 4-case conflict handling
 * 7. Enqueue original Firebase UID in pending_firebase_deletions
 * 8. Convert User row into minimal tombstone
 * 9. Write ACCOUNT_PERMANENTLY_DELETED audit event
 *
 * NOTE: Absolutely NO Firebase network calls are made inside this transaction.
 */
export async function permanentlyDeleteUser(userId: string): Promise<PermanentDeletionResult> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // 1. Lock Eligible DEACTIVATED User
    const lockedUsers = await tx.$queryRaw<
      Array<{
        id: string;
        firebase_uid: string;
        email: string;
        role: string;
        deletion_scheduled_at: Date;
      }>
    >`
      SELECT id, firebase_uid, email, role, deletion_scheduled_at
      FROM users
      WHERE id = ${userId}::uuid
        AND status = 'DEACTIVATED'
        AND deletion_scheduled_at <= ${now}
      FOR UPDATE SKIP LOCKED
    `;

    if (lockedUsers.length === 0) {
      return { deleted: false };
    }

    const user = lockedUsers[0];

    // 2. Transaction-Scoped Advisory Lock on Normalized Email
    const lockKey = getEmailReservationLockKey(user.email);
    if (typeof tx.$executeRaw === 'function') {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey});`;
    }

    // 3. Single Transaction Timestamp & Exactly 180 Days Expiry
    const permanentDeletedAt = new Date();
    const reservedUntil = new Date(permanentDeletedAt.getTime() + 180 * 24 * 60 * 60 * 1000);

    // 4. Identify and Close Active Inquiries (PENDING / ACCEPTED -> CLOSED)
    // Row-level lock (FOR UPDATE) guarantees:
    // - Any concurrent transaction modifying an inquiry must complete before this query evaluates.
    // - Under PostgreSQL READ COMMITTED, if a concurrent transaction updated the status to REJECTED/EXPIRED,
    //   re-evaluation skips that row so it is NOT returned or transitioned.
    // - Any concurrent transaction attempting to modify an inquiry after this lock is acquired will wait until this transaction commits.
    const activeInquiries = await tx.$queryRaw<Array<{ id: string; status: InquiryStatus }>>`
      SELECT id, status
      FROM inquiries
      WHERE (business_id = ${userId}::uuid OR creator_id = ${userId}::uuid)
        AND status IN ('PENDING', 'ACCEPTED')
      FOR UPDATE
    `;

    if (activeInquiries.length > 0) {
      await tx.inquiry.updateMany({
        where: {
          id: { in: activeInquiries.map((inq) => inq.id) },
          status: { in: [InquiryStatus.PENDING, InquiryStatus.ACCEPTED] },
        },
        data: {
          status: InquiryStatus.CLOSED,
          closedAt: permanentDeletedAt,
        },
      });

      for (const inq of activeInquiries) {
        await tx.auditEvent.create({
          data: {
            eventType: AuditEventType.INQUIRY_CLOSED,
            actorUserId: null,
            resourceType: 'INQUIRY',
            resourceId: inq.id,
            metadata: {
              previousStatus: inq.status,
              reason: 'PARTICIPANT_PERMANENTLY_DELETED',
              deletedUserId: userId,
            },
            createdAt: permanentDeletedAt,
          },
        });
      }
    }

    // 5. Anonymize Profile Data
    if (user.role === 'CREATOR') {
      await tx.creatorProfile.updateMany({
        where: { userId },
        data: {
          name: 'Deleted Creator',
          collaborationEmail: null,
          bio: '',
          location: '',
          specialties: [],
          profilePhotoUrl: null,
          instagramUrl: null,
          youtubeUrl: null,
          updatedAt: permanentDeletedAt,
        },
      });
    } else {
      await tx.businessProfile.updateMany({
        where: { userId },
        data: {
          businessName: 'Deleted Business',
          collaborationEmail: null,
          description: '',
          city: '',
          stateOrProvince: '',
          country: '',
          logoUrl: null,
          websiteUrl: null,
          instagramUrl: null,
          updatedAt: permanentDeletedAt,
        },
      });
    }

    // 6. Email Reservation with 4-Case Conflict Discrimination
    const emailHash = hashEmailForReservation(user.email);
    let reservationOutcome: 'CREATED' | 'REPLACED_EXPIRED' | 'ALREADY_EXISTS_SAME_USER' | 'HISTORICAL_CONFLICT' =
      'CREATED';

    // Attempt atomic insert (Case A: No conflict)
    const insertedRows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO email_reservations (id, user_id, email_hash, reserved_until, reason, created_at)
      VALUES (gen_random_uuid(), ${userId}::uuid, ${emailHash}, ${reservedUntil}, 'ACCOUNT_DELETION', ${permanentDeletedAt})
      ON CONFLICT (email_hash) DO NOTHING
      RETURNING id
    `;

    if (insertedRows.length > 0) {
      reservationOutcome = 'CREATED';
    } else {
      // Conflict: lock and inspect existing row
      const existingRows = await tx.$queryRaw<
        Array<{ id: string; user_id: string | null; reserved_until: Date }>
      >`
        SELECT id, user_id, reserved_until
        FROM email_reservations
        WHERE email_hash = ${emailHash}
        FOR UPDATE
      `;

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (new Date(existing.reserved_until) <= permanentDeletedAt) {
          // Case B: Expired reservation conflict
          // Clean expired reservation row inside the transaction and insert fresh reservation
          await tx.$executeRaw`
            DELETE FROM email_reservations WHERE id = ${existing.id}::uuid
          `;
          await tx.$executeRaw`
            INSERT INTO email_reservations (id, user_id, email_hash, reserved_until, reason, created_at)
            VALUES (gen_random_uuid(), ${userId}::uuid, ${emailHash}, ${reservedUntil}, 'ACCOUNT_DELETION', ${permanentDeletedAt})
          `;
          reservationOutcome = 'REPLACED_EXPIRED';
        } else if (existing.user_id === userId) {
          // Case C: Same-deletion idempotent retry
          // Reservation was already recorded for this user in an earlier attempt; leave untouched
          reservationOutcome = 'ALREADY_EXISTS_SAME_USER';
        } else {
          // Case D: Active historical conflict with another account
          // Leave existing reservation completely untouched (do not extend expiry or mutate reason/user_id)
          reservationOutcome = 'HISTORICAL_CONFLICT';
          logger.warn(
            { userId, emailHash, existingReservedUntil: existing.reserved_until },
            'Active historical email reservation collision detected; preserving existing reservation without mutation'
          );
        }
      }
    }

    // 7. Enqueue Original Firebase UID
    const originalFirebaseUid = user.firebase_uid;
    await tx.$executeRaw`
      INSERT INTO pending_firebase_deletions (id, firebase_uid, attempts, created_at)
      VALUES (gen_random_uuid(), ${originalFirebaseUid}, 0, ${permanentDeletedAt})
      ON CONFLICT (firebase_uid) DO NOTHING
    `;

    // 8. Convert User Row into Minimal Tombstone
    const tombstoneEmail = `deleted_${userId}@deleted.creatorconnect.internal`;
    const tombstoneUid = `deleted_${userId}`;

    await tx.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        deletedAt: permanentDeletedAt,
        email: tombstoneEmail,
        firebaseUid: tombstoneUid,
        updatedAt: permanentDeletedAt,
      },
    });

    // 9. Write Audit Event
    await tx.auditEvent.create({
      data: {
        eventType: 'ACCOUNT_PERMANENTLY_DELETED',
        actorUserId: null,
        resourceType: 'USER',
        resourceId: userId,
        metadata: {
          originalRole: user.role,
          permanentlyDeletedAt: permanentDeletedAt.toISOString(),
          emailReservedUntil: reservedUntil.toISOString(),
          reservationOutcome,
        },
        createdAt: permanentDeletedAt,
      },
    });

    logger.info(
      { userId, role: user.role, reservationOutcome },
      'User account permanently deleted successfully'
    );

    return { deleted: true, reservationOutcome };
  });
}

/**
 * Sweeps deactivated accounts that have reached their deletion deadline (30-day grace period expired).
 * Each candidate is locked and permanently deleted in its own isolated transaction.
 */
export async function sweepPermanentDeletions(batchSize = 50): Promise<{ processedCount: number }> {
  const now = new Date();

  const candidates = await prisma.user.findMany({
    where: {
      status: 'DEACTIVATED',
      deletionScheduledAt: { lte: now },
    },
    select: { id: true },
    take: batchSize,
    orderBy: { deletionScheduledAt: 'asc' },
  });

  let processedCount = 0;

  for (const candidate of candidates) {
    try {
      const result = await permanentlyDeleteUser(candidate.id);
      if (result.deleted) {
        processedCount++;
      }
    } catch (err: any) {
      logger.error(
        { userId: candidate.id, error: err.message, stack: err.stack },
        'Failed to permanently delete deactivated account during sweep'
      );
    }
  }

  return { processedCount };
}

/**
 * Worker sweep for pending Firebase deletions using backoff-based claim suppression:
 * 1. CLAIM (short transaction):
 *    - Select eligible rows using attempt-specific backoff windows with FOR UPDATE SKIP LOCKED
 *    - Atomically increment attempts and set last_attempt_at = NOW()
 *    - Commit transaction immediately
 * 2. WORK (outside transaction):
 *    - Call firebaseAdminAuth.deleteUser(firebaseUid)
 * 3. FINALIZE (per item):
 *    - If success OR auth/user-not-found: delete queue row
 *    - If transient failure: update last_error and last_attempt_at; log high-priority alert if attempts >= 10
 */
export async function sweepFirebaseDeletions(
  batchSize = 50
): Promise<{ processedCount: number; successCount: number; failedCount: number }> {
  // Step 1: CLAIM in a short transaction
  const claimedTasks = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        firebase_uid: string;
        attempts: number;
        last_attempt_at: Date | null;
      }>
    >`
      SELECT id, firebase_uid, attempts, last_attempt_at
      FROM pending_firebase_deletions
      WHERE
        last_attempt_at IS NULL
        OR (attempts = 1 AND last_attempt_at <= NOW() - INTERVAL '15 minutes')
        OR (attempts = 2 AND last_attempt_at <= NOW() - INTERVAL '30 minutes')
        OR (attempts = 3 AND last_attempt_at <= NOW() - INTERVAL '60 minutes')
        OR (attempts = 4 AND last_attempt_at <= NOW() - INTERVAL '120 minutes')
        OR (attempts = 5 AND last_attempt_at <= NOW() - INTERVAL '240 minutes')
        OR (attempts >= 6 AND last_attempt_at <= NOW() - INTERVAL '360 minutes')
      ORDER BY created_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `;

    if (rows.length === 0) {
      return [];
    }

    const claimedIds = rows.map((r) => r.id);
    await tx.pendingFirebaseDeletion.updateMany({
      where: { id: { in: claimedIds } },
      data: {
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    return rows;
  });

  if (claimedTasks.length === 0) {
    return { processedCount: 0, successCount: 0, failedCount: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  // Step 2 & 3: WORK & FINALIZE (outside transaction)
  for (const item of claimedTasks) {
    try {
      await firebaseAdminAuth.deleteUser(item.firebase_uid);

      // Successfully deleted from Firebase: remove queue item
      await prisma.pendingFirebaseDeletion.delete({
        where: { id: item.id },
      });
      successCount++;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // Idempotent success: user was already deleted from Firebase
        await prisma.pendingFirebaseDeletion.delete({
          where: { id: item.id },
        });
        successCount++;
      } else {
        failedCount++;
        const currentAttempts = item.attempts + 1;

        if (currentAttempts >= 10) {
          logger.error(
            {
              id: item.id,
              firebaseUid: item.firebase_uid,
              attempts: currentAttempts,
              error: err.message,
            },
            'ALERT: Firebase deletion task exceeded 10 attempts'
          );
        }

        await prisma.pendingFirebaseDeletion.update({
          where: { id: item.id },
          data: {
            lastError: err.message || String(err),
            lastAttemptAt: new Date(),
          },
        });
      }
    }
  }

  return {
    processedCount: claimedTasks.length,
    successCount,
    failedCount,
  };
}

/**
 * Cleans up expired email reservations where reserved_until <= NOW().
 */
export async function sweepExpiredEmailReservations(): Promise<{ deletedCount: number }> {
  const now = new Date();
  const deletedCount = await prisma.$executeRaw`
    DELETE FROM email_reservations WHERE reserved_until <= ${now}
  `;

  return { deletedCount: Number(deletedCount) };
}
