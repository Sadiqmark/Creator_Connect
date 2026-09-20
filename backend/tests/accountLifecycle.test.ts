import request from 'supertest';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';
import prisma from '../src/database/prisma';
import { UserRole, AccountStatus } from '@prisma/client';

describe('Phase 13B-2 Account Lifecycle (Deactivation & Reactivation) Test Suite', () => {
  let verifyIdTokenSpy: jest.SpyInstance;
  let revokeRefreshTokensSpy: jest.SpyInstance;

  const testCreatorId = 'd1000000-0000-4000-8000-000000000001';
  const testBusinessId = 'd2000000-0000-4000-8000-000000000002';
  const testDeletedUserId = 'd3000000-0000-4000-8000-000000000003';
  const testExpiredDeactivatedId = 'd4000000-0000-4000-8000-000000000004';

  const testCreatorProfileId = 'a1000000-0000-4000-8000-000000000001';
  const testBusinessProfileId = 'b2000000-0000-4000-8000-000000000002';

  beforeAll(async () => {
    // Clean up any existing test records
    await prisma.auditEvent.deleteMany({
      where: {
        actorUserId: { in: [testCreatorId, testBusinessId, testDeletedUserId, testExpiredDeactivatedId] },
      },
    });
    await prisma.creatorProfile.deleteMany({
      where: { userId: { in: [testCreatorId, testBusinessId, testDeletedUserId, testExpiredDeactivatedId] } },
    });
    await prisma.businessProfile.deleteMany({
      where: { userId: { in: [testCreatorId, testBusinessId, testDeletedUserId, testExpiredDeactivatedId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testCreatorId, testBusinessId, testDeletedUserId, testExpiredDeactivatedId] } },
    });

    // Seed test users
    await prisma.user.create({
      data: {
        id: testCreatorId,
        firebaseUid: 'fb_creator_lifecycle',
        email: 'creator_lifecycle@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        creatorProfile: {
          create: {
            id: testCreatorProfileId,
            name: 'Lifecycle Creator',
            niche: 'Tech',
            location: 'Bengaluru',
            bio: 'Creator for account lifecycle tests',
            specialties: ['Engineering'],
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: testBusinessId,
        firebaseUid: 'fb_business_lifecycle',
        email: 'biz_lifecycle@example.com',
        role: UserRole.BUSINESS,
        status: AccountStatus.ACTIVE,
        businessProfile: {
          create: {
            id: testBusinessProfileId,
            businessName: 'Lifecycle Enterprise',
            category: 'Tech',
            description: 'Business for lifecycle tests',
            city: 'Mumbai',
            stateOrProvince: 'MH',
            country: 'India',
          },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: testDeletedUserId,
        firebaseUid: 'fb_deleted_lifecycle',
        email: 'deleted_lifecycle@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    // Seed an expired deactivated user (deletionScheduledAt in the past)
    await prisma.user.create({
      data: {
        id: testExpiredDeactivatedId,
        firebaseUid: 'fb_expired_deactivated',
        email: 'expired_deactivated@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.DEACTIVATED,
        deactivatedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        deletionScheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({
      where: {
        actorUserId: { in: [testCreatorId, testBusinessId, testDeletedUserId, testExpiredDeactivatedId] },
      },
    });
    await prisma.creatorProfile.deleteMany({
      where: { userId: { in: [testCreatorId, testBusinessId, testDeletedUserId, testExpiredDeactivatedId] } },
    });
    await prisma.businessProfile.deleteMany({
      where: { userId: { in: [testCreatorId, testBusinessId, testDeletedUserId, testExpiredDeactivatedId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testCreatorId, testBusinessId, testDeletedUserId, testExpiredDeactivatedId] } },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdTokenSpy = jest.spyOn(firebaseAdminAuth, 'verifyIdToken');
    revokeRefreshTokensSpy = jest.spyOn(firebaseAdminAuth, 'revokeRefreshTokens').mockResolvedValue();
  });

  afterEach(() => {
    if (verifyIdTokenSpy) verifyIdTokenSpy.mockRestore();
    if (revokeRefreshTokensSpy) revokeRefreshTokensSpy.mockRestore();
  });

  describe('1. POST /api/v1/auth/deactivate', () => {
    it('should reject unauthenticated request with 401 MISSING_TOKEN', async () => {
      const res = await request(app).post('/api/v1/auth/deactivate');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should successfully deactivate an ACTIVE creator account', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_creator_lifecycle',
        email: 'creator_lifecycle@example.com',
        email_verified: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/deactivate')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Account successfully deactivated');
      expect(res.body.deactivatedAt).toBeDefined();
      expect(res.body.deletionScheduledAt).toBeDefined();
      expect(res.body.daysRemaining).toBe(30);

      // Verify PostgreSQL state
      const dbUser = await prisma.user.findUnique({ where: { id: testCreatorId } });
      expect(dbUser?.status).toBe(AccountStatus.DEACTIVATED);
      expect(dbUser?.deactivatedAt).not.toBeNull();
      expect(dbUser?.deletionScheduledAt).not.toBeNull();

      // Verify audit event
      const audit = await prisma.auditEvent.findFirst({
        where: {
          actorUserId: testCreatorId,
          eventType: 'ACCOUNT_DEACTIVATED',
        },
      });
      expect(audit).not.toBeNull();

      // Verify Firebase revokeRefreshTokens called
      expect(revokeRefreshTokensSpy).toHaveBeenCalledWith('fb_creator_lifecycle');
    });

    it('should successfully deactivate an ACTIVE business account (role independent)', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_business_lifecycle',
        email: 'biz_lifecycle@example.com',
        email_verified: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/deactivate')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body.daysRemaining).toBe(30);

      const dbUser = await prisma.user.findUnique({ where: { id: testBusinessId } });
      expect(dbUser?.status).toBe(AccountStatus.DEACTIVATED);
      expect(revokeRefreshTokensSpy).toHaveBeenCalledWith('fb_business_lifecycle');
    });

    it('should return 403 ACCOUNT_DEACTIVATED via authMiddleware when an already DEACTIVATED user calls /deactivate', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_creator_lifecycle',
        email: 'creator_lifecycle@example.com',
        email_verified: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/deactivate')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('should return 403 ACCOUNT_DELETED when DELETED user attempts deactivation', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_deleted_lifecycle',
        email: 'deleted_lifecycle@example.com',
        email_verified: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/deactivate')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DELETED');
    });

    it('should still succeed in PostgreSQL if Firebase revokeRefreshTokens throws an error', async () => {
      // Re-activate business temporarily for this test
      await prisma.user.update({
        where: { id: testBusinessId },
        data: { status: AccountStatus.ACTIVE, deactivatedAt: null, deletionScheduledAt: null },
      });

      revokeRefreshTokensSpy.mockRejectedValue(new Error('Firebase network timeout'));

      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_business_lifecycle',
        email: 'biz_lifecycle@example.com',
        email_verified: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/deactivate')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      const dbUser = await prisma.user.findUnique({ where: { id: testBusinessId } });
      expect(dbUser?.status).toBe(AccountStatus.DEACTIVATED);
    });
  });

  describe('2. authMiddleware Access Control for DEACTIVATED Users', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_creator_lifecycle',
        email: 'creator_lifecycle@example.com',
        email_verified: true,
      });
    });

    it('should block DEACTIVATED user from protected creator profile with 403 ACCOUNT_DEACTIVATED', async () => {
      const res = await request(app)
        .get('/api/v1/creators/me')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('should block DEACTIVATED user from inquiries with 403 ACCOUNT_DEACTIVATED', async () => {
      const res = await request(app)
        .get('/api/v1/inquiries')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('should block DEACTIVATED user from notifications with 403 ACCOUNT_DEACTIVATED', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('should block DEACTIVATED user from provisioning with 403 ACCOUNT_DEACTIVATED', async () => {
      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid_token')
        .send({ role: 'CREATOR' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    });

    it('should ALLOW DEACTIVATED user to call GET /api/v1/auth/me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body.user.status).toBe('DEACTIVATED');
    });
  });

  describe('3. GET /api/v1/auth/me — Privacy & Reactivation State', () => {
    it('should return deactivation metadata and omit firebaseUid for DEACTIVATED creator', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_creator_lifecycle',
        email: 'creator_lifecycle@example.com',
        email_verified: true,
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(testCreatorId);
      expect(res.body.user.email).toBe('creator_lifecycle@example.com');
      expect(res.body.user.role).toBe('CREATOR');
      expect(res.body.user.status).toBe('DEACTIVATED');
      expect(res.body.user.isReactivatable).toBe(true);
      expect(res.body.user.daysRemaining).toBe(30);
      expect(res.body.user.displayName).toBe('Lifecycle Creator');

      // Privacy verification: firebaseUid MUST NOT be exposed
      expect(res.body.user.firebaseUid).toBeUndefined();

      // Profile details MUST be null
      expect(res.body.profile).toBeNull();
      expect(res.body.onboardingCompleted).toBe(false);
    });

    it('should return businessName as displayName for DEACTIVATED business', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_business_lifecycle',
        email: 'biz_lifecycle@example.com',
        email_verified: true,
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body.user.displayName).toBe('Lifecycle Enterprise');
      expect(res.body.user.firebaseUid).toBeUndefined();
      expect(res.body.profile).toBeNull();
    });
  });

  describe('4. POST /api/v1/auth/reactivate', () => {
    it('should successfully reactivate a DEACTIVATED account within grace period', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_creator_lifecycle',
        email: 'creator_lifecycle@example.com',
        email_verified: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/reactivate')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Account successfully reactivated');
      expect(res.body.user.status).toBe('ACTIVE');

      // Verify PostgreSQL state restored
      const dbUser = await prisma.user.findUnique({ where: { id: testCreatorId } });
      expect(dbUser?.status).toBe(AccountStatus.ACTIVE);
      expect(dbUser?.deactivatedAt).toBeNull();
      expect(dbUser?.deletionScheduledAt).toBeNull();

      // Verify audit event
      const audit = await prisma.auditEvent.findFirst({
        where: {
          actorUserId: testCreatorId,
          eventType: 'ACCOUNT_REACTIVATED',
        },
      });
      expect(audit).not.toBeNull();
    });

    it('should immediately allow normal API access after reactivation', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_creator_lifecycle',
        email: 'creator_lifecycle@example.com',
        email_verified: true,
      });

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(200);
    });

    it('should return 409 ACCOUNT_ALREADY_ACTIVE when already ACTIVE user calls reactivate', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_creator_lifecycle',
        email: 'creator_lifecycle@example.com',
        email_verified: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/reactivate')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ACCOUNT_ALREADY_ACTIVE');
    });

    it('should return 410 GRACE_PERIOD_EXPIRED when grace period has expired', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_expired_deactivated',
        email: 'expired_deactivated@example.com',
        email_verified: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/reactivate')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe('GRACE_PERIOD_EXPIRED');
      expect(res.body.error.message).toContain('30-day reactivation grace period has expired');
    });

    it('should return 403 ACCOUNT_DELETED when DELETED user calls reactivate', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_deleted_lifecycle',
        email: 'deleted_lifecycle@example.com',
        email_verified: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/reactivate')
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DELETED');
    });

    it('should prove concurrency safety: only one of concurrent reactivate calls succeeds', async () => {
      // First deactivate business user
      await prisma.user.update({
        where: { id: testBusinessId },
        data: {
          status: AccountStatus.DEACTIVATED,
          deactivatedAt: new Date(),
          deletionScheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb_business_lifecycle',
        email: 'biz_lifecycle@example.com',
        email_verified: true,
      });

      // Fire two concurrent reactivation requests
      const [res1, res2] = await Promise.all([
        request(app).post('/api/v1/auth/reactivate').set('Authorization', 'Bearer valid_token'),
        request(app).post('/api/v1/auth/reactivate').set('Authorization', 'Bearer valid_token'),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      // Verify only ONE audit event was created
      const auditCount = await prisma.auditEvent.count({
        where: {
          actorUserId: testBusinessId,
          eventType: 'ACCOUNT_REACTIVATED',
        },
      });
      expect(auditCount).toBe(1);
    });
  });
});
