import request from 'supertest';
import express, { Express } from 'express';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';
import prisma from '../src/database/prisma';
import { requireRole } from '../src/middleware/requireRole';
import { authMiddleware } from '../src/middleware/authMiddleware';
import { UserRole, AccountStatus, InquiryStatus } from '@prisma/client';
import { hashEmailForReservation } from '../src/services/deletion.service';

describe('Phase 3B Comprehensive Authentication & Security Test Suite', () => {
  let verifyIdTokenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdTokenSpy = jest.spyOn(firebaseAdminAuth, 'verifyIdToken');
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
  });

  afterEach(() => {
    if (verifyIdTokenSpy) {
      verifyIdTokenSpy.mockRestore();
    }
  });

  describe('1. Missing, Malformed & Invalid Authentication (Section 3)', () => {
    it('should return 401 MISSING_TOKEN when Authorization header is omitted', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
      expect(res.body.error.message).toContain('Authentication token is required');
    });

    it('should return 401 MALFORMED_TOKEN when Bearer prefix is missing', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Basic 123456');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MALFORMED_TOKEN');
      expect(res.body.error.message).toContain('Bearer scheme');
    });

    it('should return 401 MISSING_TOKEN when Bearer token is empty', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer ');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 401 TOKEN_EXPIRED when Firebase reports expired token', async () => {
      const error: any = new Error('Firebase ID token has expired.');
      error.code = 'auth/id-token-expired';
      verifyIdTokenSpy.mockRejectedValue(error);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer expired-token');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should return 401 INVALID_TOKEN when Firebase reports invalid token signature', async () => {
      const error: any = new Error('Invalid token');
      error.code = 'auth/argument-error';
      verifyIdTokenSpy.mockRejectedValue(error);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 401 INVALID_TOKEN when Firebase reports revoked token', async () => {
      const error: any = new Error('Firebase ID token has been revoked.');
      error.code = 'auth/id-token-revoked';
      verifyIdTokenSpy.mockRejectedValue(error);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer revoked-token');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('2. Email Verification Gate (Section 3 & 6)', () => {
    it('should reject unverified email with 403 EMAIL_NOT_VERIFIED on protected endpoints', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-unverified-uid',
        email: 'unverified@example.com',
        email_verified: false,
      } as any);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer unverified-token');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
      expect(res.body.error.message).toContain('Email verification is required');
    });

    it('should reject unverified email on POST /api/v1/auth/provision', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-unverified-uid',
        email: 'unverified@example.com',
        email_verified: false,
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer unverified-token')
        .send({ role: 'CREATOR' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('should allow verified email token (email_verified=true) to proceed', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-verified-uid',
        email: 'verified@example.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u-100',
        firebaseUid: 'fb-verified-uid',
        email: 'verified@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        creatorProfile: null,
        businessProfile: null,
      } as any);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer verified-token');
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('verified@example.com');
    });
  });

  describe('3. User Provisioning & Immutability Invariants (Section 6 & 8)', () => {
    const verifiedCreatorUid = 'fb-verified-creator-uid';
    const verifiedBusinessUid = 'fb-verified-business-uid';

    it('should return 401 USER_NOT_PROVISIONED on /auth/me when token is valid but no DB User exists', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-unprovisioned-uid',
        email: 'new@example.com',
        email_verified: true,
      } as any);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('USER_NOT_PROVISIONED');
    });

    it('should reject provisioning with invalid role (not CREATOR or BUSINESS)', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: verifiedCreatorUid,
        email: 'creator@example.com',
        email_verified: true,
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ROLE');
    });

    it('should provision a new PostgreSQL user with CREATOR role', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: verifiedCreatorUid,
        email: 'creator@example.com',
        email_verified: true,
      } as any);

      const createUserMock = jest.fn().mockResolvedValue({
        id: 'c1000000-0000-4000-8000-000000000001',
        firebaseUid: verifiedCreatorUid,
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
      });

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          user: { create: createUserMock },
          auditEvent: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'CREATOR' });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('CREATOR');
      expect(res.body.user.status).toBe('ACTIVE');
      expect(res.body.onboardingCompleted).toBe(false);
      expect(createUserMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firebaseUid: verifiedCreatorUid,
            role: 'CREATOR',
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should provision a new PostgreSQL user with BUSINESS role', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: verifiedBusinessUid,
        email: 'biz@example.com',
        email_verified: true,
      } as any);

      const createUserMock = jest.fn().mockResolvedValue({
        id: 'b1000000-0000-4000-8000-000000000001',
        firebaseUid: verifiedBusinessUid,
        email: 'biz@example.com',
        role: UserRole.BUSINESS,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
      });

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          user: { create: createUserMock },
          auditEvent: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'BUSINESS' });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('BUSINESS');
      expect(res.body.user.status).toBe('ACTIVE');
      expect(res.body.onboardingCompleted).toBe(false);
    });

    it('should preserve role and ignore mutation attempts on repeated provisioning for CREATOR (Role Immutability)', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: verifiedCreatorUid,
        email: 'creator@example.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'c1000000-0000-4000-8000-000000000001',
        firebaseUid: verifiedCreatorUid,
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        creatorProfile: null,
        businessProfile: null,
      } as any);

      // Attempt to overwrite role to BUSINESS
      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'BUSINESS' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('CREATOR'); // Remains immutable CREATOR
    });

    it('should preserve role and ignore mutation attempts on repeated provisioning for BUSINESS (Role Immutability)', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: verifiedBusinessUid,
        email: 'biz@example.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'b1000000-0000-4000-8000-000000000001',
        firebaseUid: verifiedBusinessUid,
        email: 'biz@example.com',
        role: UserRole.BUSINESS,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        creatorProfile: null,
        businessProfile: null,
      } as any);

      // Attempt to overwrite role to CREATOR
      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'CREATOR' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('BUSINESS'); // Remains immutable BUSINESS
    });

    it('should handle concurrent duplicate provisioning race condition gracefully (P2002 Unique Constraint)', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-race-condition-uid',
        email: 'race@example.com',
        email_verified: true,
      } as any);

      // First check findUnique returns null (simulating concurrent start)
      jest.spyOn(prisma.user, 'findUnique')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'u-race-winner',
          firebaseUid: 'fb-race-condition-uid',
          email: 'race@example.com',
          role: UserRole.CREATOR,
          status: AccountStatus.ACTIVE,
          createdAt: new Date(),
          creatorProfile: null,
          businessProfile: null,
        } as any);

      // Transaction throws P2002 on create
      const p2002Error: any = new Error('Unique constraint failed on the fields: (`firebase_uid`)');
      p2002Error.code = 'P2002';
      jest.spyOn(prisma, '$transaction').mockRejectedValue(p2002Error);

      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'CREATOR' });

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe('u-race-winner');
      expect(res.body.user.role).toBe('CREATOR');
    });
  });

  describe('3.1 Email Reservation Enforcement on Provisioning (Phase 13B-4)', () => {
    it('should reject provisioning with 403 EMAIL_RESERVED when an active email reservation exists', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-reserved-uid',
        email: 'reserved.user@example.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.emailReservation, 'findFirst').mockResolvedValue({
        id: 'r1000000-0000-4000-8000-000000000001',
        emailHash: hashEmailForReservation('reserved.user@example.com'),
        reservedUntil: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
        reason: 'ACCOUNT_DELETION',
        createdAt: new Date(),
        userId: null,
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'CREATOR' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_RESERVED');
      expect(res.body.error.message).toBe(
        'This email address is currently reserved and cannot be used to create an account.'
      );
      // Privacy invariant: internal details must not be leaked to the client
      expect(res.body.error.emailHash).toBeUndefined();
      expect(res.body.error.reservedUntil).toBeUndefined();
      expect(res.body.error.userId).toBeUndefined();
      expect(res.body.error.reason).toBeUndefined();
    });

    it('should allow provisioning when an existing email reservation is expired', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-expired-res-uid',
        email: 'expired.reservation@example.com',
        email_verified: true,
      } as any);

      // findFirst with reservedUntil: { gt: now } returns null when reservation is expired
      jest.spyOn(prisma.emailReservation, 'findFirst').mockResolvedValue(null);

      const createUserMock = jest.fn().mockResolvedValue({
        id: 'u-expired-res-success',
        firebaseUid: 'fb-expired-res-uid',
        email: 'expired.reservation@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
      });

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          user: { create: createUserMock },
          auditEvent: { create: jest.fn().mockResolvedValue({}) },
          emailReservation: { findFirst: jest.fn().mockResolvedValue(null) },
        });
      });

      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'CREATOR' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('expired.reservation@example.com');
      expect(res.body.user.role).toBe('CREATOR');
      expect(createUserMock).toHaveBeenCalled();
    });

    it('should allow provisioning when no email reservation exists', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-clean-uid',
        email: 'brand.new@example.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.emailReservation, 'findFirst').mockResolvedValue(null);

      const createUserMock = jest.fn().mockResolvedValue({
        id: 'u-clean-success',
        firebaseUid: 'fb-clean-uid',
        email: 'brand.new@example.com',
        role: UserRole.BUSINESS,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
      });

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          user: { create: createUserMock },
          auditEvent: { create: jest.fn().mockResolvedValue({}) },
          emailReservation: { findFirst: jest.fn().mockResolvedValue(null) },
        });
      });

      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'BUSINESS' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('brand.new@example.com');
      expect(createUserMock).toHaveBeenCalled();
    });

    it('should reject provisioning when email differs only by case (case normalization)', async () => {
      const canonicalEmail = 'case.reserved@example.com';
      const variantEmail = '  Case.Reserved@EXAMPLE.COM  ';

      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-case-uid',
        email: variantEmail,
        email_verified: true,
      } as any);

      const expectedHash = hashEmailForReservation(canonicalEmail);
      const findFirstSpy = jest.spyOn(prisma.emailReservation, 'findFirst').mockResolvedValue({
        id: 'r2000000-0000-4000-8000-000000000002',
        emailHash: expectedHash,
        reservedUntil: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'CREATOR' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_RESERVED');
      expect(findFirstSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            emailHash: expectedHash,
          }),
        })
      );
    });

    it('should reject provisioning when email uses Unicode NFKC equivalent characters', async () => {
      // Kelvin symbol (\u212A 'K') normalizes to lowercase ASCII 'k' under NFKC
      const nfkcEmail = 'user\u212A@example.com';
      const asciiEquivalent = 'userk@example.com';

      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-nfkc-uid',
        email: nfkcEmail,
        email_verified: true,
      } as any);

      const expectedHash = hashEmailForReservation(asciiEquivalent);
      const findFirstSpy = jest.spyOn(prisma.emailReservation, 'findFirst').mockResolvedValue({
        id: 'r3000000-0000-4000-8000-000000000003',
        emailHash: expectedHash,
        reservedUntil: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'CREATOR' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_RESERVED');
      expect(findFirstSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            emailHash: expectedHash,
          }),
        })
      );
    });

    it('should ensure email reservation check happens before User creation and rejected signup does not create a PostgreSQL User', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-blocked-uid',
        email: 'blocked@example.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.emailReservation, 'findFirst').mockResolvedValue({
        id: 'r4000000-0000-4000-8000-000000000004',
        emailHash: hashEmailForReservation('blocked@example.com'),
        reservedUntil: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
      } as any);

      const transactionSpy = jest.spyOn(prisma, '$transaction');

      const res = await request(app)
        .post('/api/v1/auth/provision')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'CREATOR' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('EMAIL_RESERVED');
      // Proves that $transaction was not called and no user was created in the database
      expect(transactionSpy).not.toHaveBeenCalled();
    });
  });

  describe('4. /api/v1/auth/me Response Contract (Section 7)', () => {
    it('should return strongly-typed server-verified user context originating from PostgreSQL', async () => {
      const dbDate = new Date();
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-uid-1',
        email: 'user@example.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u-uuid-1234',
        firebaseUid: 'fb-uid-1',
        email: 'user@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
        createdAt: dbDate,
        creatorProfile: {
          id: 'cp-100',
          userId: 'u-uuid-1234',
          name: 'Sarah Creator',
        },
        businessProfile: null,
      } as any);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        id: 'u-uuid-1234',
        firebaseUid: 'fb-uid-1',
        email: 'user@example.com',
        role: 'CREATOR',
        status: 'ACTIVE',
        createdAt: dbDate.toISOString(),
      });
      expect(res.body.onboardingCompleted).toBe(true);
      expect(res.body.profile.name).toBe('Sarah Creator');
    });
  });

  describe('5. Role Authorization & Request Body Tampering Resistance (Section 4)', () => {
    let testApp: Express;

    beforeAll(() => {
      testApp = express();
      testApp.use(express.json());

      // Business-only route
      testApp.post(
        '/api/v1/test/business-inquiry',
        authMiddleware,
        requireRole(UserRole.BUSINESS),
        (req, res) => {
          res.status(200).json({
            status: 'ok',
            authorizedRole: req.user?.role,
            message: 'Inquiry created by authorized business',
          });
        }
      );

      // Creator-only route
      testApp.post(
        '/api/v1/test/creator-accept',
        authMiddleware,
        requireRole(UserRole.CREATOR),
        (req, res) => {
          res.status(200).json({
            status: 'ok',
            authorizedRole: req.user?.role,
            message: 'Inquiry accepted by authorized creator',
          });
        }
      );
    });

    it('should allow BUSINESS role to perform business-only action', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-biz-uid',
        email: 'biz@example.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'b-100',
        firebaseUid: 'fb-biz-uid',
        email: 'biz@example.com',
        role: UserRole.BUSINESS,
        status: AccountStatus.ACTIVE,
      } as any);

      const res = await request(testApp)
        .post('/api/v1/test/business-inquiry')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.authorizedRole).toBe('BUSINESS');
    });

    it('should reject CREATOR role attempting business-only action with 403 FORBIDDEN_ROLE', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-creator-uid',
        email: 'creator@example.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'c-100',
        firebaseUid: 'fb-creator-uid',
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
      } as any);

      const res = await request(testApp)
        .post('/api/v1/test/business-inquiry')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should reject BUSINESS role attempting creator-only action with 403 FORBIDDEN_ROLE', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-biz-uid',
        email: 'biz@example.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'b-100',
        firebaseUid: 'fb-biz-uid',
        email: 'biz@example.com',
        role: UserRole.BUSINESS,
        status: AccountStatus.ACTIVE,
      } as any);

      const res = await request(testApp)
        .post('/api/v1/test/creator-accept')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should strictly ignore client-supplied role tampering in request body and enforce server-authoritative role', async () => {
      // User is CREATOR in PostgreSQL
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-creator-uid',
        email: 'creator@example.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'c-100',
        firebaseUid: 'fb-creator-uid',
        email: 'creator@example.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
      } as any);

      // Client passes malicious body { role: "BUSINESS" } attempting to spoof business-only route
      const res = await request(testApp)
        .post('/api/v1/test/business-inquiry')
        .set('Authorization', 'Bearer valid-token')
        .send({ role: 'BUSINESS', userId: 'b-100' });

      // Must still be rejected with 403 because req.user.role from DB is CREATOR
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });

  describe('6. Resource Authorization & Ownership Checks (Section 5)', () => {
    let testApp: Express;

    beforeAll(() => {
      testApp = express();
      testApp.use(express.json());

      // Mock resource endpoint enforcing resource ownership
      testApp.get('/api/v1/test/inquiries/:id', authMiddleware, async (req, res) => {
        const inquiryId = req.params.id;
        const currentUserId = req.user?.id;

        // Mock database inquiry
        const inquiry = {
          id: inquiryId,
          businessId: 'b-owner-100',
          creatorId: 'c-owner-200',
          status: InquiryStatus.PENDING,
          brief: 'Confidential campaign brief',
        };

        if (currentUserId !== inquiry.businessId && currentUserId !== inquiry.creatorId) {
          res.status(403).json({
            error: {
              code: 'FORBIDDEN_RESOURCE',
              message: 'You are not authorized to view this inquiry.',
            },
          });
          return;
        }

        res.status(200).json({ inquiry });
      });
    });

    it('should allow authorized business participant to view their own inquiry', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-biz-owner',
        email: 'owner@biz.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'b-owner-100',
        firebaseUid: 'fb-biz-owner',
        email: 'owner@biz.com',
        role: UserRole.BUSINESS,
        status: AccountStatus.ACTIVE,
      } as any);

      const res = await request(testApp)
        .get('/api/v1/test/inquiries/inq-1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.id).toBe('inq-1');
    });

    it('should allow authorized creator participant to view their own inquiry', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-creator-owner',
        email: 'owner@creator.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'c-owner-200',
        firebaseUid: 'fb-creator-owner',
        email: 'owner@creator.com',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
      } as any);

      const res = await request(testApp)
        .get('/api/v1/test/inquiries/inq-1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.id).toBe('inq-1');
    });

    it('should reject unauthorized third-party user with 403 FORBIDDEN_RESOURCE', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'fb-stranger-uid',
        email: 'stranger@example.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-stranger-999',
        firebaseUid: 'fb-stranger-uid',
        email: 'stranger@example.com',
        role: UserRole.BUSINESS,
        status: AccountStatus.ACTIVE,
      } as any);

      const res = await request(testApp)
        .get('/api/v1/test/inquiries/inq-1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_RESOURCE');
    });
  });

  describe('7. Collaboration Email Privacy Matrix (Section 13 & 16)', () => {
    // Serialization helper function modeling domain DTO serialization
    const serializeInquiryDto = (inquiry: any, viewerUserId: string) => {
      const isParticipant =
        viewerUserId === inquiry.businessId || viewerUserId === inquiry.creatorId;

      const isAccepted = inquiry.status === InquiryStatus.ACCEPTED;
      const shouldExposeCollaborationEmail = isParticipant && isAccepted;

      return {
        id: inquiry.id,
        status: inquiry.status,
        collaborationEmail: shouldExposeCollaborationEmail
          ? inquiry.creatorProfile?.collaborationEmail || null
          : null,
      };
    };

    const mockInquiry = {
      id: 'inq-test',
      businessId: 'b-1',
      creatorId: 'c-1',
      status: InquiryStatus.PENDING,
      creatorProfile: { collaborationEmail: 'sarah.private@gmail.com' },
    };

    it('should HIDE collaboration email on public discovery / unaccepted inquiries', () => {
      const dto = serializeInquiryDto(mockInquiry, 'b-1');
      expect(dto.collaborationEmail).toBeNull();
    });

    it('should HIDE collaboration email on REJECTED inquiries', () => {
      const dto = serializeInquiryDto(
        { ...mockInquiry, status: InquiryStatus.REJECTED },
        'b-1'
      );
      expect(dto.collaborationEmail).toBeNull();
    });

    it('should HIDE collaboration email on EXPIRED inquiries', () => {
      const dto = serializeInquiryDto(
        { ...mockInquiry, status: InquiryStatus.EXPIRED },
        'b-1'
      );
      expect(dto.collaborationEmail).toBeNull();
    });

    it('should HIDE collaboration email on CLOSED inquiries', () => {
      const dto = serializeInquiryDto(
        { ...mockInquiry, status: InquiryStatus.CLOSED },
        'b-1'
      );
      expect(dto.collaborationEmail).toBeNull();
    });

    it('should EXPOSE collaboration email ONLY when inquiry is ACCEPTED and viewer is authorized participant', () => {
      const dto = serializeInquiryDto(
        { ...mockInquiry, status: InquiryStatus.ACCEPTED },
        'b-1'
      );
      expect(dto.collaborationEmail).toBe('sarah.private@gmail.com');
    });

    it('should HIDE collaboration email on ACCEPTED inquiry when viewer is an unauthorized third party', () => {
      const dto = serializeInquiryDto(
        { ...mockInquiry, status: InquiryStatus.ACCEPTED },
        'stranger-user-99'
      );
      expect(dto.collaborationEmail).toBeNull();
    });
  });

  describe('8. Account Soft Deletion Lifecycle (Section 14 & 17)', () => {
    const bizUid = 'fb-biz-delete-uid';
    const bizEmail = 'biz.delete@example.com';
    const bizUserId = 'b1000000-0000-4000-8000-000000000001';

    it('should delegate /delete-account to account deactivation (deprecated compatibility)', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: bizUid,
        email: bizEmail,
        email_verified: true,
      } as any);

      let findUniqueCallCount = 0;
      (jest.spyOn(prisma.user, 'findUnique') as any).mockImplementation(async () => {
        findUniqueCallCount++;
        return {
          id: bizUserId,
          firebaseUid: bizUid,
          email: bizEmail,
          role: UserRole.BUSINESS,
          status: findUniqueCallCount >= 3 ? AccountStatus.DEACTIVATED : AccountStatus.ACTIVE,
        };
      });

      const updateManyUserSpy = jest.fn().mockResolvedValue({ count: 1 });
      const createAuditSpy = jest.fn().mockResolvedValue({});

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          user: { updateMany: updateManyUserSpy },
          auditEvent: { create: createAuditSpy },
        });
      });

      const revokeTokensFbSpy = jest.spyOn(firebaseAdminAuth, 'revokeRefreshTokens').mockResolvedValue({} as any);

      const res = await request(app)
        .post('/api/v1/auth/delete-account')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deactivated');
      expect(res.body.daysRemaining).toBe(30);

      // Verifications:
      expect(updateManyUserSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: bizUserId, status: 'ACTIVE' },
          data: expect.objectContaining({
            status: 'DEACTIVATED',
            deactivatedAt: expect.any(Date),
            deletionScheduledAt: expect.any(Date),
          }),
        })
      );
      expect(createAuditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'ACCOUNT_DEACTIVATED',
            resourceId: bizUserId,
          }),
        })
      );
      expect(revokeTokensFbSpy).toHaveBeenCalledWith(bizUid);
    });

    it('should reject subsequent API calls from soft-deleted account with 403 ACCOUNT_DELETED', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: bizUid,
        email: bizEmail,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: bizUserId,
        firebaseUid: bizUid,
        email: bizEmail,
        role: UserRole.BUSINESS,
        status: AccountStatus.DELETED,
      } as any);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DELETED');
    });
  });
});
