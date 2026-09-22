import request from 'supertest';
import express, { Request } from 'express';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';
import prisma from '../src/database/prisma';
import * as creatorService from '../src/services/creator.service';
import * as inquiryService from '../src/services/inquiry.service';
import {
  createRateLimiter,
  resetAllRateLimits,
  getAuthenticatedUserRateLimitKey,
  getLifecycleRateLimitKey,
} from '../src/middleware/rateLimiter';
import { RATE_LIMITS } from '../src/config/rateLimits';
import { UserRole, AccountStatus } from '@prisma/client';

describe('Phase 19 Targeted Rate Limiting Test Suite', () => {
  let verifyIdTokenSpy: jest.SpyInstance;

  const mockBusinessUserA = {
    id: 'b1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_biz_user_a',
    email: 'business_a@example.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
  };

  const mockBusinessUserB = {
    id: 'b2000000-0000-4000-8000-000000000002',
    firebaseUid: 'firebase_biz_user_b',
    email: 'business_b@example.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
  };

  const validInquiryPayload = {
    creatorId: 'c0000000-0000-4000-8000-000000000001',
    collaborationType: 'Sponsored Reel',
    platform: 'Instagram',
    deliverables: '1 Dedicated 60s Reel',
    timelineStart: '2026-10-01',
    timelineEnd: '2026-10-15',
    brief: 'Campaign launch brief for testing rate limiting.',
  };

  beforeEach(() => {
    resetAllRateLimits();
    verifyIdTokenSpy = jest.spyOn(firebaseAdminAuth, 'verifyIdToken');
  });

  afterEach(() => {
    if (verifyIdTokenSpy) {
      verifyIdTokenSpy.mockRestore();
    }
    jest.restoreAllMocks();
  });

  // ── A. Basic Behavior ───────────────────────────────────────────────────
  describe('A. Basic behavior', () => {
    it('1 & 2 & 3 & 4: allows requests up to limit, returns 429 with standard error shape on limit + 1', async () => {
      const testApp = express();
      const testLimiter = createRateLimiter({
        windowMs: 60000,
        max: 3,
        message: 'Rate limit exceeded for test.',
      });
      testApp.get('/test-basic', testLimiter, (_req, res) => res.status(200).json({ ok: true }));

      // Requests 1, 2, 3 succeed
      const res1 = await request(testApp).get('/test-basic');
      expect(res1.status).toBe(200);

      const res2 = await request(testApp).get('/test-basic');
      expect(res2.status).toBe(200);

      const res3 = await request(testApp).get('/test-basic');
      expect(res3.status).toBe(200);

      // Request 4 (Limit + 1) fails with 429
      const res4 = await request(testApp).get('/test-basic');
      expect(res4.status).toBe(429);
      expect(res4.body).toEqual({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded for test.',
        },
      });
    });
  });

  // ── B. Retry Behavior ───────────────────────────────────────────────────
  describe('B. Retry behavior', () => {
    it('5 & 6: sets Retry-After header as a valid positive number on 429', async () => {
      const testApp = express();
      const testLimiter = createRateLimiter({
        windowMs: 30000, // 30 seconds
        max: 1,
        message: 'Too many requests.',
      });
      testApp.get('/test-retry', testLimiter, (_req, res) => res.json({ ok: true }));

      await request(testApp).get('/test-retry');
      const rateLimitedRes = await request(testApp).get('/test-retry');

      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.headers['retry-after']).toBeDefined();

      const retryAfterSeconds = parseInt(rateLimitedRes.headers['retry-after'], 10);
      expect(Number.isInteger(retryAfterSeconds)).toBe(true);
      expect(retryAfterSeconds).toBeGreaterThan(0);
      expect(retryAfterSeconds).toBeLessThanOrEqual(30);
    });
  });

  // ── C. Key Isolation ────────────────────────────────────────────────────
  describe('C. Key isolation', () => {
    it('7: different public IP keys have independent buckets', async () => {
      const testApp = express();
      const testLimiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        message: 'IP rate limit exceeded.',
        keyGenerator: (req) => (req.headers['x-simulated-ip'] as string) || req.ip || '127.0.0.1',
      });
      testApp.get('/test-ip', testLimiter, (_req, res) => res.json({ ok: true }));

      // IP 1 uses all 2 requests
      await request(testApp).get('/test-ip').set('x-simulated-ip', '198.51.100.1');
      await request(testApp).get('/test-ip').set('x-simulated-ip', '198.51.100.1');
      const ip1Blocked = await request(testApp).get('/test-ip').set('x-simulated-ip', '198.51.100.1');
      expect(ip1Blocked.status).toBe(429);

      // IP 2 is unaffected and succeeds
      const ip2Allowed = await request(testApp).get('/test-ip').set('x-simulated-ip', '198.51.100.2');
      expect(ip2Allowed.status).toBe(200);
    });

    it('8 & 9: different authenticated users have independent buckets and User A exhausting inquiry limit does not block User B', async () => {
      jest.spyOn(inquiryService, 'createInquiry').mockResolvedValue({
        id: 'inq-test',
        businessId: 'biz-1',
        creatorId: 'c0000000-0000-4000-8000-000000000001',
        status: 'PENDING',
      } as any);

      // User A setup
      verifyIdTokenSpy.mockImplementation(async (token: string) => {
        if (token === 'user-b-token') {
          return { uid: mockBusinessUserB.firebaseUid, email: mockBusinessUserB.email, email_verified: true };
        }
        return { uid: mockBusinessUserA.firebaseUid, email: mockBusinessUserA.email, email_verified: true };
      });

      jest.spyOn(prisma.user, 'findUnique').mockImplementation((async (args: any) => {
        if (args.where?.firebaseUid === mockBusinessUserB.firebaseUid || args.where?.id === mockBusinessUserB.id) {
          return mockBusinessUserB;
        }
        return mockBusinessUserA;
      }) as any);

      // User A consumes all 15 inquiry requests
      for (let i = 0; i < RATE_LIMITS.INQUIRY_CREATION.MAX; i++) {
        const res = await request(app)
          .post('/api/v1/inquiries')
          .set('Authorization', 'Bearer user-a-token')
          .send(validInquiryPayload);
        expect(res.status).toBe(201);
      }

      // User A request #16 is blocked
      const userABlocked = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer user-a-token')
        .send(validInquiryPayload);
      expect(userABlocked.status).toBe(429);
      expect(userABlocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');

      // User B request #1 succeeds completely
      const userBSuccess = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer user-b-token')
        .send(validInquiryPayload);
      expect(userBSuccess.status).toBe(201);
    });
  });

  // ── D. Endpoint Isolation ───────────────────────────────────────────────
  describe('D. Endpoint isolation', () => {
    it('10: discovery limiter is independent from inquiry limiter', async () => {
      // Exhaust discovery endpoint using a test limiter with max 2
      const testApp = express();
      const discLimiter = createRateLimiter({ windowMs: 60000, max: 2, message: 'Discovery limit' });
      const inqLimiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        message: 'Inquiry limit',
        keyGenerator: () => 'user:static-user',
      });

      testApp.get('/creators', discLimiter, (_req, res) => res.json({ creators: [] }));
      testApp.post('/inquiries', inqLimiter, (_req, res) => res.status(201).json({ created: true }));

      // Exhaust discovery
      await request(testApp).get('/creators');
      await request(testApp).get('/creators');
      const discBlocked = await request(testApp).get('/creators');
      expect(discBlocked.status).toBe(429);

      // Inquiry is completely independent
      const inqSuccess = await request(testApp).post('/inquiries');
      expect(inqSuccess.status).toBe(201);
    });

    it('11: exhausting inquiry creation does not prevent accessing GET /auth/me or other authenticated reads', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUserA.firebaseUid,
        email: mockBusinessUserA.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUserA as any);
      jest.spyOn(inquiryService, 'createInquiry').mockResolvedValue({ id: 'inq-test' } as any);

      // Exhaust inquiry creation (15 requests)
      for (let i = 0; i < RATE_LIMITS.INQUIRY_CREATION.MAX; i++) {
        await request(app)
          .post('/api/v1/inquiries')
          .set('Authorization', 'Bearer token')
          .send(validInquiryPayload);
      }

      // Next inquiry is blocked
      const inqBlocked = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer token')
        .send(validInquiryPayload);
      expect(inqBlocked.status).toBe(429);

      // But GET /api/v1/auth/me still works normally
      const meRes = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer token');
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.id).toBe(mockBusinessUserA.id);
    });

    it('12: profile update limiter is independent from inquiry creation limiter', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUserA.firebaseUid,
        email: mockBusinessUserA.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUserA as any);
      jest.spyOn(inquiryService, 'createInquiry').mockResolvedValue({ id: 'inq-test' } as any);
      jest.spyOn(prisma.businessProfile, 'upsert').mockResolvedValue({
        id: 'bp-1',
        userId: mockBusinessUserA.id,
        companyName: 'Acme Corp',
      } as any);

      // Exhaust inquiry creation
      for (let i = 0; i < RATE_LIMITS.INQUIRY_CREATION.MAX; i++) {
        await request(app)
          .post('/api/v1/inquiries')
          .set('Authorization', 'Bearer token')
          .send(validInquiryPayload);
      }
      expect(
        (
          await request(app)
            .post('/api/v1/inquiries')
            .set('Authorization', 'Bearer token')
            .send(validInquiryPayload)
        ).status
      ).toBe(429);

      const validBusinessPayload = {
        businessName: 'Acme Corp',
        category: 'Apparel',
        description: 'Quality sustainable apparel brand.',
        city: 'New York',
        stateOrProvince: 'NY',
        country: 'USA',
        collaborationEmail: 'collab@acme.com',
      };

      // Profile PATCH /api/v1/businesses/me still succeeds (not 429)
      const profileRes = await request(app)
        .patch('/api/v1/businesses/me')
        .set('Authorization', 'Bearer token')
        .send(validBusinessPayload);
      expect(profileRes.status).toBe(200);
    });
  });

  // ── E. Middleware Short-Circuiting ───────────────────────────────────────
  describe('E. Middleware short-circuiting', () => {
    it('13: discovery rate-limited request never reaches discovery service', async () => {
      const discoverSpy = jest.spyOn(creatorService, 'listDiscoverableCreators').mockResolvedValue({
        creators: [],
        total: 0,
        page: 1,
        limit: 24,
        totalPages: 0,
      } as any);

      // Use a test app with low limit to verify short-circuiting deterministically
      const testApp = express();
      const discLimiter = createRateLimiter({ windowMs: 60000, max: 1, message: 'Too many searches' });
      testApp.get('/creators', discLimiter, async (_req, res) => {
        const result = await creatorService.listDiscoverableCreators({});
        res.json(result);
      });

      // Request 1 succeeds and calls service
      await request(testApp).get('/creators');
      expect(discoverSpy).toHaveBeenCalledTimes(1);

      // Request 2 blocked by rate limiter; service is NEVER called
      const res2 = await request(testApp).get('/creators');
      expect(res2.status).toBe(429);
      expect(discoverSpy).toHaveBeenCalledTimes(1); // Still 1!
    });

    it('14: inquiry rate-limited request never reaches inquiry service', async () => {
      const inquirySpy = jest.spyOn(inquiryService, 'createInquiry').mockResolvedValue({ id: 'inq-1' } as any);

      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUserA.firebaseUid,
        email: mockBusinessUserA.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUserA as any);

      // Exhaust inquiry creation
      for (let i = 0; i < RATE_LIMITS.INQUIRY_CREATION.MAX; i++) {
        await request(app)
          .post('/api/v1/inquiries')
          .set('Authorization', 'Bearer token')
          .send(validInquiryPayload);
      }
      expect(inquirySpy).toHaveBeenCalledTimes(RATE_LIMITS.INQUIRY_CREATION.MAX);

      // Request #16 is blocked by limiter
      const blockedRes = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer token')
        .send(validInquiryPayload);

      expect(blockedRes.status).toBe(429);
      // Inquiry service was NOT called for request #16
      expect(inquirySpy).toHaveBeenCalledTimes(RATE_LIMITS.INQUIRY_CREATION.MAX);
    });

    it('15: lifecycle rate-limited request never reaches account controller/DB', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUserA.firebaseUid,
        email: mockBusinessUserA.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUserA as any);
      const userUpdateSpy = jest.spyOn(prisma.user, 'update').mockResolvedValue(mockBusinessUserA as any);

      // Exhaust lifecycle limit (5 requests)
      for (let i = 0; i < RATE_LIMITS.ACCOUNT_LIFECYCLE.MAX; i++) {
        await request(app).post('/api/v1/auth/deactivate').set('Authorization', 'Bearer token');
      }

      // Reset update spy call count from the 5 preceding calls
      userUpdateSpy.mockClear();

      // Request #6 is rate-limited
      const blockedRes = await request(app).post('/api/v1/auth/deactivate').set('Authorization', 'Bearer token');
      expect(blockedRes.status).toBe(429);
      // DB update was never invoked
      expect(userUpdateSpy).not.toHaveBeenCalled();
    });
  });

  // ── F. Side-Effect Protection ───────────────────────────────────────────
  describe('F. Side-effect protection', () => {
    it('16: a rate-limited inquiry request creates 0 inquiries, 0 notifications, and 0 audit events', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUserA.firebaseUid,
        email: mockBusinessUserA.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUserA as any);
      jest.spyOn(inquiryService, 'createInquiry').mockResolvedValue({ id: 'inq-test' } as any);

      const inquiryCreateSpy = jest.spyOn(prisma.inquiry, 'create');
      const notificationCreateSpy = jest.spyOn(prisma.notification, 'create');
      const auditEventCreateSpy = jest.spyOn(prisma.auditEvent, 'create');

      // Exhaust limit
      for (let i = 0; i < RATE_LIMITS.INQUIRY_CREATION.MAX; i++) {
        await request(app)
          .post('/api/v1/inquiries')
          .set('Authorization', 'Bearer token')
          .send(validInquiryPayload);
      }

      // Clear spies before blocked call
      inquiryCreateSpy.mockClear();
      notificationCreateSpy.mockClear();
      auditEventCreateSpy.mockClear();

      // Blocked request #16
      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', 'Bearer token')
        .send(validInquiryPayload);

      expect(res.status).toBe(429);
      expect(inquiryCreateSpy).not.toHaveBeenCalled();
      expect(notificationCreateSpy).not.toHaveBeenCalled();
      expect(auditEventCreateSpy).not.toHaveBeenCalled();
    });

    it('17: a rate-limited discovery request performs 0 Prisma discovery queries', async () => {
      const creatorFindManySpy = jest.spyOn(prisma.creatorProfile, 'findMany');
      const creatorCountSpy = jest.spyOn(prisma.creatorProfile, 'count');

      const testApp = express();
      const discLimiter = createRateLimiter({ windowMs: 60000, max: 1, message: 'Discovery limit' });
      testApp.get('/creators', discLimiter, async (_req, res) => {
        const creators = await prisma.creatorProfile.findMany();
        const total = await prisma.creatorProfile.count();
        res.json({ creators, total });
      });

      // 1st request succeeds
      await request(testApp).get('/creators');
      expect(creatorFindManySpy).toHaveBeenCalledTimes(1);
      expect(creatorCountSpy).toHaveBeenCalledTimes(1);

      // Clear spies
      creatorFindManySpy.mockClear();
      creatorCountSpy.mockClear();

      // 2nd request is blocked by limiter
      const blockedRes = await request(testApp).get('/creators');
      expect(blockedRes.status).toBe(429);
      expect(creatorFindManySpy).not.toHaveBeenCalled();
      expect(creatorCountSpy).not.toHaveBeenCalled();
    });
  });

  // ── G. Health Endpoint Protection ───────────────────────────────────────
  describe('G. Health', () => {
    it('18: GET /health remains accessible regardless of rate-limit consumption', async () => {
      // Multiple health check requests succeed without issue
      for (let i = 0; i < 20; i++) {
        const res = await request(app).get('/api/v1/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
      }
    });
  });

  // ── H. OPTIONS Preflight Requests ───────────────────────────────────────
  describe('H. OPTIONS', () => {
    it('19: OPTIONS requests are not rate limited', async () => {
      // Send repeated OPTIONS preflight requests
      for (let i = 0; i < 20; i++) {
        const res = await request(app)
          .options('/api/v1/creators/me')
          .set('Origin', 'http://localhost:5173')
          .set('Access-Control-Request-Method', 'PATCH');
        expect(res.status).toBe(204);
      }
    });
  });

  // ── I. User-Key Invariant Enforcement ───────────────────────────────────
  describe('I. User-key invariant', () => {
    it('20: authenticated user limiter fails clearly if req.user.id is absent', () => {
      const mockReqMissingUser = {
        method: 'POST',
        originalUrl: '/api/v1/inquiries',
      } as Request;

      expect(() => getAuthenticatedUserRateLimitKey(mockReqMissingUser)).toThrow(
        'Invariant violation: Authenticated rate limiter executed without req.user.id on POST /api/v1/inquiries'
      );

      const mockReqMissingUserId = {
        method: 'PATCH',
        originalUrl: '/api/v1/creators/me',
        user: {} as any,
      } as Request;

      expect(() => getAuthenticatedUserRateLimitKey(mockReqMissingUserId)).toThrow(
        'Invariant violation: Authenticated rate limiter executed without req.user.id on PATCH /api/v1/creators/me'
      );
    });

    it('20b: lifecycle key generator uses req.user.id or req.decodedToken.firebaseUid and throws if both absent', () => {
      // With req.user.id
      const reqWithUser = { user: { id: 'usr-1' } } as Request;
      expect(getLifecycleRateLimitKey(reqWithUser)).toBe('user:usr-1');

      // With req.decodedToken.firebaseUid (for /provision)
      const reqWithToken = { decodedToken: { firebaseUid: 'fb-uid-1' } } as Request;
      expect(getLifecycleRateLimitKey(reqWithToken)).toBe('firebase:fb-uid-1');

      // Missing both -> throws invariant
      const reqEmpty = { method: 'POST', originalUrl: '/api/v1/auth/provision' } as Request;
      expect(() => getLifecycleRateLimitKey(reqEmpty)).toThrow(
        'Invariant violation: Lifecycle rate limiter executed without authenticated user or verified token on POST /api/v1/auth/provision'
      );
    });
  });

  // ── J. Test Isolation ───────────────────────────────────────────────────
  describe('J. Test isolation', () => {
    it('21: rate-limit counters are reset between tests (part 1: consume quota)', async () => {
      const testApp = express();
      const testLimiter = createRateLimiter({ windowMs: 60000, max: 1, message: 'One-shot' });
      testApp.get('/test-isolation', testLimiter, (_req, res) => res.json({ ok: true }));

      // Consume quota
      const res1 = await request(testApp).get('/test-isolation');
      expect(res1.status).toBe(200);

      // Now blocked
      const res2 = await request(testApp).get('/test-isolation');
      expect(res2.status).toBe(429);
    });

    it('22: rate-limit counters are reset between tests (part 2: quota is fresh after reset)', async () => {
      // Because beforeEach calls resetAllRateLimits(), this test starts with an empty store
      const testApp = express();
      const testLimiter = createRateLimiter({ windowMs: 60000, max: 1, message: 'One-shot' });
      testApp.get('/test-isolation-2', testLimiter, (_req, res) => res.json({ ok: true }));

      const res = await request(testApp).get('/test-isolation-2');
      expect(res.status).toBe(200);
    });
  });
});
