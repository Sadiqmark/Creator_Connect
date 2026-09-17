import request from 'supertest';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';
import prisma from '../src/database/prisma';
import { UserRole, AccountStatus, InquiryStatus } from '@prisma/client';

describe('Phase 9B Business Inquiry Management Test Suite', () => {
  let verifyIdTokenSpy: jest.SpyInstance;

  const mockBusinessUserA = {
    id: 'b1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_biz_a',
    email: 'business-a@example.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
  };

  const mockBusinessUserB = {
    id: 'b2000000-0000-4000-8000-000000000002',
    firebaseUid: 'firebase_biz_b',
    email: 'business-b@example.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
  };

  const mockCreatorUser = {
    id: 'c1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_creator_1',
    email: 'creator@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
  };

  const mockCreatorProfile = {
    id: 'c0000000-0000-4000-8000-000000000001',
    userId: mockCreatorUser.id,
    name: 'Elena Rostova',
    niche: 'Fashion',
    location: 'Mumbai, India',
    bio: 'High-fashion editorial stylist and visual creator.',
    specialties: ['Fashion Styling', 'Photography'],
    instagramUrl: 'https://instagram.com/elenarostova',
    youtubeUrl: 'https://youtube.com/@elenarostova',
    profilePhotoUrl: 'https://storage.googleapis.com/test/photo1.jpg',
    collaborationEmail: 'private-secret-email@agency.com',
  };

  const mockInquiryIdA = 'e1000000-0000-4000-8000-000000000001';
  const mockInquiryIdB = 'e2000000-0000-4000-8000-000000000002';

  const sampleInquiryA = {
    id: mockInquiryIdA,
    businessId: mockBusinessUserA.id,
    creatorId: mockCreatorUser.id,
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
    creator: {
      creatorProfile: mockCreatorProfile,
    },
  };

  const sampleInquiryB = {
    id: mockInquiryIdB,
    businessId: mockBusinessUserB.id,
    creatorId: mockCreatorUser.id,
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
    creator: {
      creatorProfile: mockCreatorProfile,
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
    it('should return 401 when accessing GET /api/v1/inquiries unauthenticated', async () => {
      const res = await request(app).get('/api/v1/inquiries');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 401 when accessing GET /api/v1/inquiries/:inquiryId unauthenticated', async () => {
      const res = await request(app).get(`/api/v1/inquiries/${mockInquiryIdA}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 403 FORBIDDEN_ROLE when a CREATOR attempts to list business inquiries', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const res = await request(app)
        .get('/api/v1/inquiries')
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should return 403 FORBIDDEN_ROLE when a CREATOR attempts to access business inquiry detail', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });

  // ─── 2. GET /api/v1/inquiries (LIST) ────────────────────────────────────────
  describe('2. GET /api/v1/inquiries — List Business Inquiries', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUserA.firebaseUid,
        email: mockBusinessUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUserA as any);
    });

    it('should return 200 with paginated inquiries for authenticated business', async () => {
      jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(1);
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([sampleInquiryA as any]);

      const res = await request(app)
        .get('/api/v1/inquiries')
        .set('Authorization', 'Bearer biz-token');

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
      expect(item.creator).toEqual({
        id: mockCreatorProfile.id,
        name: mockCreatorProfile.name,
        profilePhotoUrl: mockCreatorProfile.profilePhotoUrl,
        niche: mockCreatorProfile.niche,
        location: mockCreatorProfile.location,
      });

      // Assert query strictly scoped to businessId
      expect(prisma.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            businessId: mockBusinessUserA.id,
          }),
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 10,
        })
      );
    });

    it('should strictly isolate inquiries across businesses (Business A cannot list Business B inquiries)', async () => {
      // Setup spy to check where clause
      const findManySpy = jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/inquiries')
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiries).toHaveLength(0);
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            businessId: mockBusinessUserA.id,
          }),
        })
      );
    });

    it('should filter inquiries by status when valid status query is provided', async () => {
      const countSpy = jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(1);
      const findManySpy = jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([sampleInquiryA as any]);

      const res = await request(app)
        .get('/api/v1/inquiries?status=PENDING')
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      expect(countSpy).toHaveBeenCalledWith({
        where: {
          businessId: mockBusinessUserA.id,
          status: InquiryStatus.PENDING,
        },
      });
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessId: mockBusinessUserA.id,
            status: InquiryStatus.PENDING,
          },
        })
      );
    });

    it('should support filtering by all inquiry statuses including CLOSED', async () => {
      const countSpy = jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([]);

      const statuses = [
        InquiryStatus.PENDING,
        InquiryStatus.ACCEPTED,
        InquiryStatus.REJECTED,
        InquiryStatus.EXPIRED,
        InquiryStatus.CLOSED,
      ];

      for (const st of statuses) {
        const res = await request(app)
          .get(`/api/v1/inquiries?status=${st}`)
          .set('Authorization', 'Bearer biz-token');

        expect(res.status).toBe(200);
        expect(countSpy).toHaveBeenCalledWith({
          where: {
            businessId: mockBusinessUserA.id,
            status: st,
          },
        });
      }
    });

    it('should return 400 INVALID_STATUS_FILTER when an invalid status query parameter is passed', async () => {
      const res = await request(app)
        .get('/api/v1/inquiries?status=INVALID_STATUS')
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_FILTER');
    });

    it('should respect custom pagination page and limit parameters', async () => {
      jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(25);
      const findManySpy = jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/inquiries?page=2&limit=5')
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      expect(res.body.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 25,
        totalPages: 5,
      });
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });

    it('should filter inquiries by creatorId when valid creatorId UUID query parameter is provided', async () => {
      const countSpy = jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(1);
      const findManySpy = jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([sampleInquiryA as any]);

      const res = await request(app)
        .get(`/api/v1/inquiries?creatorId=${mockCreatorProfile.id}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      expect(countSpy).toHaveBeenCalledWith({
        where: {
          businessId: mockBusinessUserA.id,
          OR: [
            { creatorId: mockCreatorProfile.id },
            { creator: { creatorProfile: { id: mockCreatorProfile.id } } },
          ],
        },
      });
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessId: mockBusinessUserA.id,
            OR: [
              { creatorId: mockCreatorProfile.id },
              { creator: { creatorProfile: { id: mockCreatorProfile.id } } },
            ],
          },
        })
      );
    });

    it('should return 400 VALIDATION_ERROR when an invalid creatorId UUID query parameter is passed', async () => {
      const res = await request(app)
        .get('/api/v1/inquiries?creatorId=not-a-valid-uuid')
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── 3. GET /api/v1/inquiries/:inquiryId (DETAIL) ───────────────────────────
  describe('3. GET /api/v1/inquiries/:inquiryId — Business Inquiry Detail', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUserA.firebaseUid,
        email: mockBusinessUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUserA as any);
    });

    it('should return 200 with full safe inquiry details when owned by the business', async () => {
      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(sampleInquiryA as any);

      const res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      const inq = res.body.inquiry;
      expect(inq.id).toBe(mockInquiryIdA);
      expect(inq.status).toBe('PENDING');
      expect(inq.collaborationType).toBe('Sponsored Reel Campaign');
      expect(inq.platform).toBe('Instagram');
      expect(inq.deliverables).toBe('1 Dedicated Reel + 2 Stories with product link');
      expect(inq.timelineStart).toBe('2026-10-01');
      expect(inq.timelineEnd).toBe('2026-10-15');
      expect(inq.brief).toBe('Campaign brief introducing our upcoming winter apparel collection.');
      expect(inq.additionalRequirements).toBe('Provide raw video footage within 48h of posting.');
      expect(inq.createdAt).toBe('2026-09-10T10:00:00.000Z');
      expect(inq.expiresAt).toBe('2026-11-09T10:00:00.000Z');
      expect(inq.respondedAt).toBeNull();
      expect(inq.closedAt).toBeNull();

      // Creator public details
      expect(inq.creator).toEqual({
        id: mockCreatorProfile.id,
        name: mockCreatorProfile.name,
        profilePhotoUrl: mockCreatorProfile.profilePhotoUrl,
        niche: mockCreatorProfile.niche,
        location: mockCreatorProfile.location,
        bio: mockCreatorProfile.bio,
        specialties: mockCreatorProfile.specialties,
        instagramUrl: mockCreatorProfile.instagramUrl,
        youtubeUrl: mockCreatorProfile.youtubeUrl,
      });
    });

    it('should return 404 INQUIRY_NOT_FOUND when inquiry does not exist', async () => {
      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INQUIRY_NOT_FOUND');
    });

    it('should return 404 INQUIRY_NOT_FOUND when requesting inquiry owned by another business (Cross-Business Privacy Isolation)', async () => {
      // sampleInquiryB belongs to Business B
      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(sampleInquiryB as any);

      const res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdB}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INQUIRY_NOT_FOUND');
    });

    it('should return 404 INQUIRY_NOT_FOUND for malformed UUID format', async () => {
      const res = await request(app)
        .get('/api/v1/inquiries/not-a-valid-uuid')
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INQUIRY_NOT_FOUND');
    });
  });

  // ─── 4. PRIVACY & SECURITY LEAKAGE INVARIANTS ──────────────────────────────
  describe('4. Privacy & Leakage Invariants', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUserA.firebaseUid,
        email: mockBusinessUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUserA as any);
    });

    it('NEVER leaks creator collaborationEmail or firebaseUid in list response', async () => {
      jest.spyOn(prisma.inquiry, 'count').mockResolvedValue(1);
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([sampleInquiryA as any]);

      const res = await request(app)
        .get('/api/v1/inquiries')
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      const rawBody = JSON.stringify(res.body);
      expect(rawBody).not.toContain('private-secret-email@agency.com');
      expect(rawBody).not.toContain('firebase_creator_1');
      expect(rawBody).not.toContain('firebase_biz_a');
    });

    it('NEVER leaks creator collaborationEmail or firebaseUid in detail response', async () => {
      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(sampleInquiryA as any);

      const res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      const rawBody = JSON.stringify(res.body);
      expect(rawBody).not.toContain('private-secret-email@agency.com');
      expect(rawBody).not.toContain('firebase_creator_1');
      expect(rawBody).not.toContain('firebase_biz_a');
    });
  });

  // ─── 5. STATE MUTATION PROTECTION ──────────────────────────────────────────
  describe('5. State Mutation Protection for Business Role', () => {
    beforeEach(() => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUserA.firebaseUid,
        email: mockBusinessUserA.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUserA as any);
    });

    it('should return 403 FORBIDDEN_ROLE when a Business user attempts to call POST accept', async () => {
      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryIdA}/accept`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should return 403 FORBIDDEN_ROLE when a Business user attempts to call POST reject', async () => {
      const res = await request(app)
        .post(`/api/v1/inquiries/${mockInquiryIdA}/reject`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });
});
