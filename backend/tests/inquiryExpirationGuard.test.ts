import request from 'supertest';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';
import prisma from '../src/database/prisma';
import { UserRole, AccountStatus, InquiryStatus } from '@prisma/client';
import {
  runExpirationSweep,
  startInquiryExpirationRunner,
  stopInquiryExpirationRunner,
} from '../src/jobs/expirationRunner';
import * as inquiryService from '../src/services/inquiry.service';

describe('Phase 12 Inquiry Expiration Guard & Runner Test Suite', () => {
  const mockCreatorUser = {
    id: 'c1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_creator_1',
    email: 'creator@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
  };

  const mockBusinessUser = {
    id: 'b1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_biz_1',
    email: 'biz@example.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
  };

  const mockInquiryId = 'e1000000-0000-4000-8000-000000000001';

  const pastExpirationDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

  const expiredPendingInquiry = {
    id: mockInquiryId,
    businessId: mockBusinessUser.id,
    creatorId: mockCreatorUser.id,
    status: InquiryStatus.PENDING,
    collaborationType: 'Sponsored Reel',
    platform: 'Instagram',
    deliverables: '1 Dedicated Reel with link in bio',
    timelineStart: null,
    timelineEnd: null,
    brief: 'Detailed campaign brief for product promotion',
    additionalRequirements: null,
    createdAt: new Date(Date.now() - 61 * 24 * 60 * 60 * 1000), // 61 days ago
    expiresAt: pastExpirationDate,
    respondedAt: null,
    closedAt: null,
    creator: {
      creatorProfile: { id: 'cp-001' },
    },
  };

  beforeEach(() => {
    jest.restoreAllMocks();

    jest.spyOn(firebaseAdminAuth, 'verifyIdToken').mockResolvedValue({
      uid: mockCreatorUser.firebaseUid,
      email: mockCreatorUser.email,
      email_verified: true,
    } as any);

    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);
  });

  describe('1. Transition-Time Expiration Guard in transitionInquiryByCreator', () => {
    it('should reject accept attempt with 409 INVALID_INQUIRY_STATE when inquiry has passed expiresAt', async () => {
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const txMock = {
          inquiry: {
            findUnique: jest.fn().mockResolvedValue(expiredPendingInquiry),
            updateMany: jest.fn(),
          },
          notification: { create: jest.fn() },
          auditEvent: { create: jest.fn() },
        };
        return callback(txMock);
      });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/accept`)
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_INQUIRY_STATE');
      expect(res.body.error.message).toContain('expired');
    });

    it('should reject reject attempt with 409 INVALID_INQUIRY_STATE when inquiry has passed expiresAt', async () => {
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const txMock = {
          inquiry: {
            findUnique: jest.fn().mockResolvedValue(expiredPendingInquiry),
            updateMany: jest.fn(),
          },
          notification: { create: jest.fn() },
          auditEvent: { create: jest.fn() },
        };
        return callback(txMock);
      });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/reject`)
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_INQUIRY_STATE');
      expect(res.body.error.message).toContain('expired');
    });

    it('should reject transition if atomic CAS updateMany matches 0 rows due to racing expiration', async () => {
      const validPendingInquiry = {
        ...expiredPendingInquiry,
        expiresAt: new Date(Date.now() + 10 * 1000), // Still valid in memory
      };

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const txMock = {
          inquiry: {
            findUnique: jest.fn().mockResolvedValue(validPendingInquiry),
            // CAS update matches 0 rows because expiresAt lapsed concurrently in DB
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          notification: { create: jest.fn() },
          auditEvent: { create: jest.fn() },
        };
        return callback(txMock);
      });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryId}/accept`)
        .set('Authorization', 'Bearer valid_token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_INQUIRY_STATE');
    });
  });

  describe('2. In-Process Expiration Sweep Runner (runExpirationSweep)', () => {
    it('should invoke expireInquiries and return the expired count', async () => {
      const expireSpy = jest
        .spyOn(inquiryService, 'expireInquiries')
        .mockResolvedValue({ expiredCount: 3 });

      const count = await runExpirationSweep();

      expect(count).toBe(3);
      expect(expireSpy).toHaveBeenCalledTimes(1);
    });

    it('should catch errors from expireInquiries without throwing or crashing the process', async () => {
      jest
        .spyOn(inquiryService, 'expireInquiries')
        .mockRejectedValue(new Error('Postgres connection pool exhausted'));

      const count = await runExpirationSweep();

      expect(count).toBe(0); // Safely returns 0 on error without unhandled rejection
    });
  });

  describe('3. Comprehensive Expiration Service Invariants (Section A & D)', () => {
    it('PENDING inquiry with expiresAt <= now transitions to EXPIRED, keeps respondedAt null, closedAt null, and unchanged expiresAt', async () => {
      const pastDate = new Date(Date.now() - 3600 * 1000);
      const targetInquiry = {
        id: 'inq-exp-test-001',
        businessId: mockBusinessUser.id,
        creatorId: mockCreatorUser.id,
        status: InquiryStatus.PENDING,
        expiresAt: pastDate,
      };

      const findManySpy = jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([targetInquiry as any]);
      const updateManySpy = jest.fn().mockResolvedValue({ count: 1 });
      const createNotifSpy = jest.fn().mockResolvedValue({});
      const createAuditSpy = jest.fn().mockResolvedValue({});

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          inquiry: { updateMany: updateManySpy },
          notification: { create: createNotifSpy },
          auditEvent: { create: createAuditSpy },
        });
      });

      const { expiredCount } = await inquiryService.expireInquiries();

      expect(expiredCount).toBe(1);

      // Invariant: Prisma findMany query strictly matches PENDING and expiresAt <= now
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: InquiryStatus.PENDING,
            expiresAt: expect.objectContaining({ lte: expect.any(Date) }),
          }),
        })
      );

      // Invariant: Only status is updated to EXPIRED; respondedAt, closedAt, and expiresAt are NOT modified
      expect(updateManySpy).toHaveBeenCalledWith({
        where: {
          id: targetInquiry.id,
          status: InquiryStatus.PENDING,
          expiresAt: { lte: expect.any(Date) },
        },
        data: {
          status: InquiryStatus.EXPIRED,
        },
      });

      // Invariant: Exactly one INQUIRY_EXPIRED notification emitted to the business user
      expect(createNotifSpy).toHaveBeenCalledTimes(1);
      expect(createNotifSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockBusinessUser.id,
          type: 'INQUIRY_EXPIRED',
          referenceId: targetInquiry.id,
        }),
      });

      // Invariant: Exactly one INQUIRY_EXPIRED audit event emitted
      expect(createAuditSpy).toHaveBeenCalledTimes(1);
      expect(createAuditSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'INQUIRY_EXPIRED',
          actorUserId: null,
          resourceType: 'INQUIRY',
          resourceId: targetInquiry.id,
          metadata: {
            previousStatus: 'PENDING',
            newStatus: 'EXPIRED',
          },
        }),
      });
    });

    it('PENDING inquiry with expiresAt > now is filtered out and remains PENDING', async () => {
      // FindMany returns empty when no inquiries have expiresAt <= now
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([]);
      const updateManySpy = jest.fn();

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          inquiry: { updateMany: updateManySpy },
          notification: { create: jest.fn() },
          auditEvent: { create: jest.fn() },
        });
      });

      const { expiredCount } = await inquiryService.expireInquiries();

      expect(expiredCount).toBe(0);
      expect(updateManySpy).not.toHaveBeenCalled();
    });

    it('Non-PENDING inquiries (ACCEPTED, REJECTED, CLOSED, EXPIRED) are strictly excluded from expiration even if expiresAt is in the past', async () => {
      // Database query findMany filters strictly on status: PENDING
      const findManySpy = jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([]);
      const updateManySpy = jest.fn();

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          inquiry: { updateMany: updateManySpy },
          notification: { create: jest.fn() },
          auditEvent: { create: jest.fn() },
        });
      });

      const { expiredCount } = await inquiryService.expireInquiries();

      expect(expiredCount).toBe(0);
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: InquiryStatus.PENDING,
          }),
        })
      );
      expect(updateManySpy).not.toHaveBeenCalled();
    });

    it('Repeated expiration runs do not create duplicate notifications (idempotent)', async () => {
      // First run transitions inquiry
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValueOnce([
        { id: 'inq-idempotent-001', businessId: mockBusinessUser.id, creatorId: mockCreatorUser.id } as any,
      ]);
      const updateManySpy = jest.fn().mockResolvedValue({ count: 1 });
      const createNotifSpy = jest.fn().mockResolvedValue({});

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          inquiry: { updateMany: updateManySpy },
          notification: { create: createNotifSpy },
          auditEvent: { create: jest.fn() },
        });
      });

      const run1 = await inquiryService.expireInquiries();
      expect(run1.expiredCount).toBe(1);
      expect(createNotifSpy).toHaveBeenCalledTimes(1);

      // Second run: no stale pending inquiries exist
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValueOnce([]);
      const run2 = await inquiryService.expireInquiries();
      expect(run2.expiredCount).toBe(0);
      // No second notification created
      expect(createNotifSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Expiration Runner Lifecycle & Configuration (Section E)', () => {
    beforeEach(() => {
      stopInquiryExpirationRunner();
    });

    afterEach(() => {
      stopInquiryExpirationRunner();
    });

    it('startInquiryExpirationRunner executes startup sweep and configures unref interval of 15 minutes', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const expireSpy = jest.spyOn(inquiryService, 'expireInquiries').mockResolvedValue({ expiredCount: 0 });

      startInquiryExpirationRunner();

      // Immediate startup sweep executed
      expect(expireSpy).toHaveBeenCalledTimes(1);

      // Configured 15-minute interval (15 * 60 * 1000 = 900,000 ms)
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 900000);

      stopInquiryExpirationRunner();
      setIntervalSpy.mockRestore();
    });

    it('stopInquiryExpirationRunner clears the timer gracefully and is idempotent', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      startInquiryExpirationRunner();
      stopInquiryExpirationRunner();

      expect(clearIntervalSpy).toHaveBeenCalled();

      // Second stop call is safe and idempotent
      expect(() => stopInquiryExpirationRunner()).not.toThrow();

      clearIntervalSpy.mockRestore();
    });
  });
});
