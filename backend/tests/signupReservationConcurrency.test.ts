import { Pool, PoolClient } from 'pg';
import prisma from '../src/database/prisma';
import {
  normalizeEmail,
  hashEmailForReservation,
  getEmailReservationLockKey,
  permanentlyDeleteUser,
} from '../src/services/deletion.service';
import request from 'supertest';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';

describe('Phase 13B-4 Genuine PostgreSQL Advisory Lock & Signup Reservation Concurrency Test Suite', () => {
  const dbUrl =
    process.env.DATABASE_URL?.replace(/\?schema=.*$/, '') ||
    'postgresql://ikhaan@localhost:5432/creator_connect';

  let pool: Pool;
  let clientA: PoolClient;
  let clientB: PoolClient;

  const testDeactivatedUserId = 'a4000000-0000-4000-8000-000000000001';
  const testDeactivatedFbUid = 'fb_deactivated_race_1';
  const testRaceEmail = 'race.reservation@example.com';

  const testScenarioBUserId = 'a4000000-0000-4000-8000-000000000002';
  const testScenarioBFbUid = 'fb_deactivated_race_2';
  const testScenarioBEmail = 'scenario.b.race@example.com';

  const otherEmail1 = 'other1@example.com';
  const otherEmail2 = 'other2@example.com';

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl });
    clientA = await pool.connect();
    clientB = await pool.connect();

    // Verify independent backend PIDs
    const pidA = await clientA.query('SELECT pg_backend_pid();');
    const pidB = await clientB.query('SELECT pg_backend_pid();');
    expect(pidA.rows[0].pg_backend_pid).not.toBe(pidB.rows[0].pg_backend_pid);
  });

  afterAll(async () => {
    if (clientA) {
      clientA.release();
    }
    if (clientB) {
      clientB.release();
    }
    if (pool) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    // Cleanup any reservations or users for test emails
    const hashes = [
      hashEmailForReservation(testRaceEmail),
      hashEmailForReservation(testScenarioBEmail),
      hashEmailForReservation(otherEmail1),
      hashEmailForReservation(otherEmail2),
    ];
    await prisma.pendingFirebaseDeletion.deleteMany();
    await prisma.emailReservation.deleteMany({
      where: { emailHash: { in: hashes } },
    });
    await prisma.auditEvent.deleteMany({
      where: {
        resourceType: 'USER',
        resourceId: { in: [testDeactivatedUserId, testScenarioBUserId] },
      },
    });
    await prisma.creatorProfile.deleteMany({
      where: { userId: { in: [testDeactivatedUserId, testScenarioBUserId] } },
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { in: [testRaceEmail, testScenarioBEmail, otherEmail1, otherEmail2] } },
          { id: { in: [testDeactivatedUserId, testScenarioBUserId] } },
          { firebaseUid: { in: [testDeactivatedFbUid, testScenarioBFbUid] } },
        ],
      },
    });
  });

  // =========================================================================
  // 1. Email Canonicalization Tests
  // =========================================================================
  describe('Email Canonicalization & Determinism', () => {
    it('proves normalizeEmail trims, lowercases, and applies NFKC Unicode normalization', () => {
      const canonical = 'user@example.com';
      expect(normalizeEmail('  user@example.com  ')).toBe(canonical);
      expect(normalizeEmail('User@Example.COM')).toBe(canonical);
      expect(normalizeEmail('\t USER@example.com \n')).toBe(canonical);

      // Kelvin symbol (\u212A 'K') normalizes to ASCII 'k' under NFKC
      expect(normalizeEmail('user\u212A@example.com')).toBe('userk@example.com');
    });

    it('proves the same logical email always produces identical reservation hash and advisory lock key', () => {
      const variants = [
        'test.canonical@example.com',
        '  Test.Canonical@EXAMPLE.com  ',
        '\tTEST.CANONICAL@example.com\n',
      ];

      const expectedNormalized = 'test.canonical@example.com';
      const expectedHash = hashEmailForReservation(expectedNormalized);
      const expectedLockKey = getEmailReservationLockKey(expectedNormalized);

      expect(typeof expectedLockKey).toBe('bigint');

      for (const variant of variants) {
        expect(normalizeEmail(variant)).toBe(expectedNormalized);
        expect(hashEmailForReservation(variant)).toBe(expectedHash);
        expect(getEmailReservationLockKey(variant)).toBe(expectedLockKey);
      }
    });

    it('proves different logical emails yield distinct reservation hashes and advisory lock keys', () => {
      const email1 = 'alpha@example.com';
      const email2 = 'beta@example.com';

      expect(hashEmailForReservation(email1)).not.toBe(hashEmailForReservation(email2));
      expect(getEmailReservationLockKey(email1)).not.toBe(getEmailReservationLockKey(email2));
    });
  });

  // =========================================================================
  // 2. Low-level Advisory Lock Isolation Tests
  // =========================================================================
  describe('Low-Level PostgreSQL Advisory Lock Properties', () => {
    it('proves different emails do not block each other on transaction advisory locks', async () => {
      const key1 = getEmailReservationLockKey(otherEmail1);
      const key2 = getEmailReservationLockKey(otherEmail2);

      expect(key1).not.toBe(key2);

      // Client A begins and locks otherEmail1
      await clientA.query('BEGIN;');
      await clientA.query('SELECT pg_advisory_xact_lock($1);', [key1.toString()]);

      // Client B begins and locks otherEmail2 concurrently
      await clientB.query('BEGIN;');
      let clientBAcquired = false;
      await clientB.query('SELECT pg_advisory_xact_lock($1);', [key2.toString()]);
      clientBAcquired = true;

      // Proves Client B acquired its lock immediately without blocking on Client A
      expect(clientBAcquired).toBe(true);

      await clientA.query('COMMIT;');
      await clientB.query('COMMIT;');
    });

    it('proves identical lock keys serialize competing PostgreSQL connections', async () => {
      const lockKey = getEmailReservationLockKey(testRaceEmail);

      await clientA.query('BEGIN;');
      await clientA.query('SELECT pg_advisory_xact_lock($1);', [lockKey.toString()]);

      await clientB.query('BEGIN;');
      let clientBAcquired = false;
      const clientBLockPromise = clientB
        .query('SELECT pg_advisory_xact_lock($1);', [lockKey.toString()])
        .then(() => {
          clientBAcquired = true;
        });

      // Verify Client B is blocked while Client A holds the lock
      await new Promise((r) => setTimeout(r, 60));
      expect(clientBAcquired).toBe(false);

      // Client A commits, releasing the lock
      await clientA.query('COMMIT;');

      // Client B unblocks immediately
      await clientBLockPromise;
      expect(clientBAcquired).toBe(true);

      await clientB.query('COMMIT;');
    });
  });

  // =========================================================================
  // 3. Real Production-Path Concurrency Tests
  // =========================================================================
  describe('Real Production-Path Concurrency Scenarios', () => {
    it('Scenario A (Permanent Deletion Wins): proves permanentlyDeleteUser acquires lock first, commits, and provisionUser observes EMAIL_RESERVED', async () => {
      // 1. Seed existing DEACTIVATED user whose 30-day grace period has expired
      const pastDeadline = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await prisma.user.create({
        data: {
          id: testDeactivatedUserId,
          firebaseUid: testDeactivatedFbUid,
          email: testRaceEmail,
          role: 'CREATOR',
          status: 'DEACTIVATED',
          deactivatedAt: pastDeadline,
          deletionScheduledAt: pastDeadline,
          creatorProfile: {
            create: {
              name: 'Original Creator',
              niche: 'Tech',
              location: 'Bengaluru',
              bio: 'Original bio',
              collaborationEmail: testRaceEmail,
            },
          },
        },
      });

      // 2. Mock Firebase auth for concurrent provisioning attempt with a new Firebase identity for the same email
      const verifyIdTokenSpy = jest.spyOn(firebaseAdminAuth, 'verifyIdToken').mockResolvedValue({
        uid: 'fb_concurrent_signup_attempt',
        email: testRaceEmail,
        email_verified: true,
      } as any);

      // 3. Launch actual production permanentlyDeleteUser and actual production provisionUser concurrently
      // permanentlyDeleteUser starts first, acquires pg_advisory_xact_lock, and provisionUser serializes behind it
      const deletionPromise = permanentlyDeleteUser(testDeactivatedUserId);
      const provisioningPromise = request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'CREATOR' });

      // 4. Await both actual production operations
      const [deletionResult, provisioningRes] = await Promise.all([
        deletionPromise,
        provisioningPromise,
      ]);

      // Verify permanent deletion succeeded
      expect(deletionResult.deleted).toBe(true);
      expect(deletionResult.reservationOutcome).toBe('CREATED');

      // Verify provisioning unblocked, observed the committed EmailReservation under the lock, and rejected with 403 EMAIL_RESERVED
      expect(provisioningRes.status).toBe(403);
      expect(provisioningRes.body.error.code).toBe('EMAIL_RESERVED');
      expect(provisioningRes.body.error.message).toBe(
        'This email address is currently reserved and cannot be used to create an account.'
      );

      // Invariant verification: Exactly ONE EmailReservation exists
      const emailHash = hashEmailForReservation(testRaceEmail);
      const reservations = await prisma.emailReservation.findMany({
        where: { emailHash },
      });
      expect(reservations.length).toBe(1);
      expect(reservations[0].reason).toBe('ACCOUNT_DELETION');

      // Invariant verification: No new user was created for fb_concurrent_signup_attempt
      const newUser = await prisma.user.findUnique({
        where: { firebaseUid: 'fb_concurrent_signup_attempt' },
      });
      expect(newUser).toBeNull();

      // Invariant verification: Original user is correctly tombstoned and anonymized
      const tombstonedUser = await prisma.user.findUnique({
        where: { id: testDeactivatedUserId },
        include: { creatorProfile: true },
      });
      expect(tombstonedUser).not.toBeNull();
      expect(tombstonedUser?.status).toBe('DELETED');
      expect(tombstonedUser?.email).toBe(`deleted_${testDeactivatedUserId}@deleted.creatorconnect.internal`);
      expect(tombstonedUser?.firebaseUid).toBe(`deleted_${testDeactivatedUserId}`);
      expect(tombstonedUser?.creatorProfile?.name).toBe('Deleted Creator');
      expect(tombstonedUser?.creatorProfile?.collaborationEmail).toBeNull();

      // Invariant verification: Original Firebase UID is enqueued for background cleanup
      const queueItem = await prisma.pendingFirebaseDeletion.findUnique({
        where: { firebaseUid: testDeactivatedFbUid },
      });
      expect(queueItem).not.toBeNull();
      expect(queueItem?.attempts).toBe(0);

      verifyIdTokenSpy.mockRestore();
    });

    it('Scenario B (Provisioning Attempts First): proves provisioning cannot create duplicate User for DEACTIVATED email, and permanent deletion subsequently completes cleanly', async () => {
      // 1. Seed existing DEACTIVATED user who still owns testScenarioBEmail in users.email
      const pastDeadline = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await prisma.user.create({
        data: {
          id: testScenarioBUserId,
          firebaseUid: testScenarioBFbUid,
          email: testScenarioBEmail,
          role: 'CREATOR',
          status: 'DEACTIVATED',
          deactivatedAt: pastDeadline,
          deletionScheduledAt: pastDeadline,
          creatorProfile: {
            create: {
              name: 'Scenario B Creator',
              niche: 'Fashion',
              location: 'Delhi',
              bio: 'Scenario B bio',
              collaborationEmail: testScenarioBEmail,
            },
          },
        },
      });

      const verifyIdTokenSpy = jest.spyOn(firebaseAdminAuth, 'verifyIdToken').mockResolvedValue({
        uid: 'fb_scenario_b_concurrent_attempt',
        email: testScenarioBEmail,
        email_verified: true,
      } as any);

      // 2. Launch actual production provisionUser first, then permanentlyDeleteUser concurrently
      const provisioningPromise = request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'CREATOR' });

      const deletionPromise = permanentlyDeleteUser(testScenarioBUserId);

      // 3. Await both operations
      const [provisioningRes, deletionResult] = await Promise.all([
        provisioningPromise,
        deletionPromise,
      ]);

      // Verify provisioning did NOT create a user with status 201 (either 403 EMAIL_RESERVED or failed gracefully)
      expect(provisioningRes.status).not.toBe(201);

      // Verify permanent deletion completed successfully
      expect(deletionResult.deleted).toBe(true);

      // Invariant verification: Exactly ONE user exists (tombstoned), no duplicate user
      const duplicateCheck = await prisma.user.findUnique({
        where: { firebaseUid: 'fb_scenario_b_concurrent_attempt' },
      });
      expect(duplicateCheck).toBeNull();

      const tombstoned = await prisma.user.findUnique({
        where: { id: testScenarioBUserId },
      });
      expect(tombstoned?.status).toBe('DELETED');
      expect(tombstoned?.email).toBe(`deleted_${testScenarioBUserId}@deleted.creatorconnect.internal`);

      // Invariant verification: Exactly ONE email reservation exists
      const hashB = hashEmailForReservation(testScenarioBEmail);
      const reservationsB = await prisma.emailReservation.findMany({
        where: { emailHash: hashB },
      });
      expect(reservationsB.length).toBe(1);

      verifyIdTokenSpy.mockRestore();
    });
  });
});
