import request from 'supertest';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';
import prisma from '../src/database/prisma';
import { UserRole, AccountStatus, InquiryStatus } from '@prisma/client';

describe('Phase 10B Creator Inquiry Management Test Suite', () => {
  let verifyIdTokenSpy: jest.SpyInstance;

  const mockCreatorUserA = {
    id: 'c1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_creator_a',
    email: 'creator-a@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
  };

  const mockCreatorUserB = {
    id: 'c2000000-0000-4000-8000-000000000002',
    firebaseUid: 'firebase_creator_b',
    email: 'creator-b@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
  };

  const mockBusinessUser = {
    id: 'b1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_biz_1',
    email: 'business@example.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
  };

  const mockBusinessProfile = {
    id: 'b0000000-0000-4000-8000-000000000001',
    userId: mockBusinessUser.id,
    businessName: 'Acme Brand Co.',
    category: 'Fashion & Apparel',
    description: 'Leading lifestyle and streetwear apparel company.',
    city: 'Mumbai',
    stateOrProvince: 'Maharashtra',
    country: 'India',
    logoUrl: 'https://storage.googleapis.com/test/brand-logo.jpg',
    websiteUrl: 'https://acmebrand.example.com',
    instagramUrl: 'https://instagram.com/acmebrand',
    collaborationEmail: 'private-secret-business-email@brand.com',
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-01T00:00:00Z'),
  };

  const mockInquiryIdA = 'e1000000-0000-4000-8000-000000000001';
  const mockInquiryIdB = 'e2000000-0000-4000-8000-000000000002';

  const sampleInquiryA = {
    id: mockInquiryIdA,
    businessId: mockBusinessUser.id,
    creatorId: mockCreatorUserA.id,
    status: InquiryStatus.PENDING,
    collaborationType: 'Sponsored Reel Campaign',
    platform: 'Instagram',
    deliverables: '1 Dedicated Reel + 2 Stories with product link',
    timelineStart: new Date('2026-10-01'),
    timelineEnd: new Date('2026-10-15'),
    brief: 'Campaign brief introducing our upcoming winter apparel collection.',
    additionalRequirements: 'Provide raw video footage within 48h of posting.',
    createdAt: new Date('2026-09-10T10:00:00Z'),
    expiresAt: new Date('2026-11-09T10:00:00Z'),
    respondedAt: null,
    closedAt: null,
    business: {
      businessProfile: mockBusinessProfile,
    },
  };

  const sampleInquiryB = {
    id: mockInquiryIdB,
    businessId: mockBusinessUser.id,
    creatorId: mockCreatorUserB.id,
    status: InquiryStatus.ACCEPTED,
    collaborationType: 'YouTube Dedicated Review',
    platform: 'YouTube',
    deliverables: '1 Dedicated 8-min video review',
    timelineStart: new Date('2026-10-10'),
    timelineEnd: new Date('2026-10-25'),
    brief: 'In-depth camera test and lifestyle integration.',
    additionalRequirements: null,
    createdAt: new Date('2026-09-12T14:00:00Z'),
    expiresAt: new Date('2026-11-11T14:00:00Z'),
    respondedAt: new Date('2026-09-13T09:00:00Z'),
    closedAt: null,
    business: {
      businessProfile: mockBusinessProfile,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdTokenSpy = jest.spyOn(firebaseAdminAuth, 'verifyIdToken');
  });

  afterEach(() => {
    if (verifyIdTokenSpy) {
      verifyIdTokenSpy.mockRestore();
    }
  });

  // ─── 1. AUTHENTICATION & AUTHORIZATION GUARDS ───────────────────────────────
  describe('1. Authentication & Authorization Guards', () => {
    it('should return 401 when accessing GET /api/v1/creators/me/inquiries unauthenticated', async () => {
      const res = await request(app).get('/api/v1/creators/me/inquiries');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 401 when accessing GET /api/v1/creators/me/inquiries/:inquiryId unauthenticated', async () => {
      const res = await request(app).get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 403 FORBIDDEN_ROLE when a BUSINESS attempts to access Creator inquiry list', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);

      const res = await request(app)
        .get('/api/v1/creators/me/inquiries')
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should return 403 FORBIDDEN_ROLE when a BUSINESS attempts to access Creator inquiry detail', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);

      const res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });

  // ─── 2. GET /api/v1/creators/me/inquiries (LIST) ───────────────────────────
  describe('2. GET /api/v1/creators/me/inquiries — List Creator Inquiries', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);
    });

    it('should return 200 with paginated inquiries for authenticated creator', async () => {
      jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(1);
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([sampleInquiryA as any]);

      const res = await request(app)
        .get('/api/v1/creators/me/inquiries')
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiries).toHaveLength(1);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });

      const item = res.body.inquiries[0];
      expect(item.id).toBe(mockInquiryIdA);
      expect(item.status).toBe('PENDING');
      expect(item.collaborationType).toBe('Sponsored Reel Campaign');
      expect(item.platform).toBe('Instagram');
      expect(item.deliverables).toBe('1 Dedicated Reel + 2 Stories with product link');
      expect(item.timelineStart).toBe('2026-10-01');
      expect(item.timelineEnd).toBe('2026-10-15');
      expect(item.createdAt).toBe('2026-09-10T10:00:00.000Z');
      expect(item.expiresAt).toBe('2026-11-09T10:00:00.000Z');
      expect(item.respondedAt).toBeNull();
      expect(item.business).toEqual({
        id: mockBusinessProfile.id,
        businessName: mockBusinessProfile.businessName,
        logoUrl: mockBusinessProfile.logoUrl,
        category: mockBusinessProfile.category,
        city: mockBusinessProfile.city,
        country: mockBusinessProfile.country,
      });

      // Assert query strictly scoped to creatorId
      expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            creatorId: mockCreatorUserA.id,
          }),
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 10,
        })
      );
    });

    it('should strictly isolate inquiries across creators (Creator A cannot see Creator B inquiries)', async () => {
      const findManySpy = jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/creators/me/inquiries')
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiries).toHaveLength(0);
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            creatorId: mockCreatorUserA.id,
          }),
        })
      );
    });

    it('should handle custom pagination parameters', async () => {
      jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(25);
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([sampleInquiryA as any]);

      const res = await request(app)
        .get('/api/v1/creators/me/inquiries?page=2&limit=5')
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 25,
        totalPages: 5,
      });

      expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });

    it('should cap pagination limit at 50', async () => {
      jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(100);
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/creators/me/inquiries?limit=100')
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(50);
      expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should sort deterministically by createdAt DESC', async () => {
      jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(1);
      const findManySpy = jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([sampleInquiryA as any]);

      const res = await request(app)
        .get('/api/v1/creators/me/inquiries')
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it.each([
      InquiryStatus.PENDING,
      InquiryStatus.ACCEPTED,
      InquiryStatus.REJECTED,
      InquiryStatus.EXPIRED,
      InquiryStatus.CLOSED,
    ])('should filter inquiries by valid status: %s', async (status) => {
      const countSpy = jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(1);
      const findManySpy = jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([
        { ...sampleInquiryA, status } as any,
      ]);

      const res = await request(app)
        .get(`/api/v1/creators/me/inquiries?status=${status}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(countSpy).toHaveBeenCalledWith({
        where: {
          creatorId: mockCreatorUserA.id,
          status,
        },
      });
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            creatorId: mockCreatorUserA.id,
            status,
          },
        })
      );
    });

    it('should return 400 INVALID_STATUS_FILTER for invalid status parameter', async () => {
      const res = await request(app)
        .get('/api/v1/creators/me/inquiries?status=INVALID_STATUS')
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_FILTER');
    });

    it('should return 200 with empty inquiries array when no inquiries match', async () => {
      jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/creators/me/inquiries')
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiries).toEqual([]);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });
  });

  // ─── 3. GET /api/v1/creators/me/inquiries/:inquiryId (DETAIL) ───────────────
  describe('3. GET /api/v1/creators/me/inquiries/:inquiryId — Creator Inquiry Detail', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);
    });

    it('should return 200 with full inquiry detail for owned inquiry', async () => {
      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(sampleInquiryA as any);

      const res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry).toEqual({
        id: mockInquiryIdA,
        status: 'PENDING',
        collaborationType: 'Sponsored Reel Campaign',
        platform: 'Instagram',
        deliverables: '1 Dedicated Reel + 2 Stories with product link',
        timelineStart: '2026-10-01',
        timelineEnd: '2026-10-15',
        brief: 'Campaign brief introducing our upcoming winter apparel collection.',
        additionalRequirements: 'Provide raw video footage within 48h of posting.',
        createdAt: '2026-09-10T10:00:00.000Z',
        expiresAt: '2026-11-09T10:00:00.000Z',
        respondedAt: null,
        closedAt: null,
        business: {
          id: mockBusinessProfile.id,
          businessName: mockBusinessProfile.businessName,
          logoUrl: mockBusinessProfile.logoUrl,
          category: mockBusinessProfile.category,
          description: mockBusinessProfile.description,
          city: mockBusinessProfile.city,
          stateOrProvince: mockBusinessProfile.stateOrProvince,
          country: mockBusinessProfile.country,
          websiteUrl: mockBusinessProfile.websiteUrl,
          instagramUrl: mockBusinessProfile.instagramUrl,
        },
        contact: null,
      });
    });

    it('should return 404 INQUIRY_NOT_FOUND when inquiry does not exist', async () => {
      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INQUIRY_NOT_FOUND');
    });

    it('should return 404 INQUIRY_NOT_FOUND when inquiry belongs to another creator (privacy-preserving)', async () => {
      // Inquiry B belongs to Creator B, but Creator A is calling
      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(sampleInquiryB as any);

      const res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdB}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INQUIRY_NOT_FOUND');
    });

    it('should return 404 INQUIRY_NOT_FOUND when inquiryId is not a valid UUID', async () => {
      const res = await request(app)
        .get('/api/v1/creators/me/inquiries/not-a-valid-uuid')
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INQUIRY_NOT_FOUND');
    });
  });

  // ─── 4. PRIVACY & SENSITIVE DATA LEAKAGE PREVENTION ─────────────────────────
  describe('4. Privacy & Sensitive Data Leakage Prevention', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);
    });

    it('NEVER leaks business collaborationEmail or firebaseUid in list response', async () => {
      jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(1);
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([sampleInquiryA as any]);

      const res = await request(app)
        .get('/api/v1/creators/me/inquiries')
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      const rawBody = JSON.stringify(res.body);
      expect(rawBody).not.toContain('private-secret-business-email@brand.com');
      expect(rawBody).not.toContain('firebase_biz_1');
      expect(rawBody).not.toContain('firebase_creator_a');
      expect(res.body.inquiries[0].business.businessName).toBe('Acme Brand Co.');
    });

    it('NEVER leaks business collaborationEmail or firebaseUid in detail response', async () => {
      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(sampleInquiryA as any);

      const res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      const rawBody = JSON.stringify(res.body);
      expect(rawBody).not.toContain('private-secret-business-email@brand.com');
      expect(rawBody).not.toContain('firebase_biz_1');
      expect(rawBody).not.toContain('firebase_creator_a');
      expect(res.body.inquiry.business.businessName).toBe('Acme Brand Co.');
    });
  });

  // ─── 5. PHASE 8 ACCEPT / REJECT INTEGRATION ────────────────────────────────
  describe('5. Phase 8 Accept / Reject Integration', () => {
    it('allows Creator to accept a PENDING inquiry via existing Phase 8 endpoint', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          inquiry: {
            findUnique: jest.fn().mockResolvedValue({
              ...sampleInquiryA,
              creator: { creatorProfile: { id: 'c0000000-0000-4000-8000-000000000001' } },
            }),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          notification: {
            create: jest.fn().mockResolvedValue({}),
          },
          auditEvent: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryIdA}/accept`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.status).toBe('ACCEPTED');
    });

    it('allows Creator to reject a PENDING inquiry via existing Phase 8 endpoint', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);

      jest.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          inquiry: {
            findUnique: jest.fn().mockResolvedValue({
              ...sampleInquiryA,
              creator: { creatorProfile: { id: 'c0000000-0000-4000-8000-000000000001' } },
            }),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          notification: {
            create: jest.fn().mockResolvedValue({}),
          },
          auditEvent: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryIdA}/reject`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.status).toBe('REJECTED');
    });

    it('denies Business user from accepting an inquiry with 403 FORBIDDEN_ROLE', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryIdA}/accept`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('denies Business user from rejecting an inquiry with 403 FORBIDDEN_ROLE', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);

      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryIdA}/reject`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });
});
