import request from 'supertest';
import { app } from '../src/app';
import prisma from '../src/database/prisma';
import { firebaseAdminAuth } from '../src/config/firebase';
import { UserRole, AccountStatus, InquiryStatus } from '@prisma/client';

describe('Phase 11A — Controlled Contact Exchange Integration Test Suite', () => {
  let verifyIdTokenSpy: jest.SpyInstance;

  // ─── Mock Identities & Data Fixtures ──────────────────────────────────────

  const mockBusinessUserA = {
    id: 'b1000000-0000-4000-8000-000000000001',
    firebaseUid: 'fb-biz-user-11a',
    email: 'business-auth-private@brandcorp.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockBusinessProfileA = {
    id: 'bp100000-0000-4000-8000-000000000001',
    userId: mockBusinessUserA.id,
    businessName: 'Lumina Studio',
    category: 'Fashion & Apparel',
    description: 'Contemporary apparel label in Milan.',
    city: 'Milan',
    stateOrProvince: 'Lombardy',
    country: 'Italy',
    logoUrl: 'https://images.example.com/logo.jpg',
    websiteUrl: 'https://luminastudio.example.com',
    instagramUrl: 'https://instagram.com/luminastudio',
    collaborationEmail: 'collab-partnerships@luminastudio.com',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockBusinessUserB = {
    id: 'b2000000-0000-4000-8000-000000000002',
    firebaseUid: 'fb-biz-user-11b',
    email: 'other-biz-auth@otherbrand.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockCreatorUserA = {
    id: 'c1000000-0000-4000-8000-000000000001',
    firebaseUid: 'fb-creator-user-11a',
    email: 'creator-auth-private@agency.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockCreatorProfileA = {
    id: 'cp100000-0000-4000-8000-000000000001',
    userId: mockCreatorUserA.id,
    name: 'Elena Rostova',
    niche: 'Fashion',
    location: 'Milan, Italy',
    bio: 'High-fashion visual creator and aesthetic director.',
    specialties: ['Fashion Styling', 'Photography'],
    instagramUrl: 'https://instagram.com/elenarostova',
    youtubeUrl: 'https://youtube.com/@elenarostova',
    profilePhotoUrl: 'https://images.example.com/elena.jpg',
    collaborationEmail: 'direct-collab@elenarostova.com',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockCreatorUserB = {
    id: 'c2000000-0000-4000-8000-000000000002',
    firebaseUid: 'fb-creator-user-11b',
    email: 'other-creator-auth@otheragency.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockInquiryIdA = 'e1000000-0000-4000-8000-000000000001';

  const baseInquiryRecord = {
    id: mockInquiryIdA,
    businessId: mockBusinessUserA.id,
    creatorId: mockCreatorUserA.id,
    status: InquiryStatus.PENDING,
    collaborationType: 'Sponsored Reel',
    platform: 'Instagram',
    deliverables: '1 Dedicated Reel + 2 Stories',
    timelineStart: new Date('2026-10-01'),
    timelineEnd: new Date('2026-10-15'),
    brief: 'Showcase our luxury knitwear collection in Milan street environments.',
    additionalRequirements: 'Provide high-resolution raw assets within 48 hours.',
    createdAt: new Date('2026-09-10T10:00:00Z'),
    expiresAt: new Date('2026-11-09T10:00:00Z'),
    respondedAt: null,
    closedAt: null,
    creator: {
      id: mockCreatorUserA.id,
      status: mockCreatorUserA.status,
      deletedAt: mockCreatorUserA.deletedAt,
      creatorProfile: mockCreatorProfileA,
    },
    business: {
      id: mockBusinessUserA.id,
      status: mockBusinessUserA.status,
      deletedAt: mockBusinessUserA.deletedAt,
      businessProfile: mockBusinessProfileA,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    verifyIdTokenSpy = jest.spyOn(firebaseAdminAuth, 'verifyIdToken').mockResolvedValue({
      uid: mockBusinessUserA.firebaseUid,
      email: mockBusinessUserA.email,
      email_verified: true,
    } as any);

    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUserA as any);
  });

  // ─── 1. AUTHENTICATION & ROLE GUARDS ───────────────────────────────────────
  describe('1. Authentication & Role Guards', () => {
    it('should return 401 when accessing Business inquiry detail unauthenticated', async () => {
      const res = await request(app).get(`/api/v1/inquiries/${mockInquiryIdA}`);
      expect(res.status).toBe(401);
    });

    it('should return 401 when accessing Creator inquiry detail unauthenticated', async () => {
      const res = await request(app).get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`);
      expect(res.status).toBe(401);
    });

    it('should return 403 when a CREATOR attempts to access Business inquiry detail endpoint', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);

      const res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should return 403 when a BUSINESS attempts to access Creator inquiry detail endpoint', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUserA.firebaseUid,
        email: mockBusinessUserA.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUserA as any);

      const res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });

  // ─── 2. CROSS-TENANT ISOLATION (404 INQUIRY_NOT_FOUND) ─────────────────────
  describe('2. Cross-Tenant Privacy Isolation', () => {
    it('should return 404 when Business B requests an inquiry owned by Business A', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUserB.firebaseUid,
        email: mockBusinessUserB.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUserB as any);
      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(baseInquiryRecord as any);

      const res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-b-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INQUIRY_NOT_FOUND');
    });

    it('should return 404 when Creator B requests an inquiry belonging to Creator A', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserB.firebaseUid,
        email: mockCreatorUserB.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserB as any);
      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(baseInquiryRecord as any);

      const res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer creator-b-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INQUIRY_NOT_FOUND');
    });
  });

  // ─── 3. NON-ACCEPTED STATES MUST RETURN CONTACT: NULL ───────────────────────
  describe('3. Non-Accepted Lifecycle States Must Withhold Contact (contact: null)', () => {
    const nonAcceptedStatuses: InquiryStatus[] = [
      InquiryStatus.PENDING,
      InquiryStatus.REJECTED,
      InquiryStatus.EXPIRED,
      InquiryStatus.CLOSED,
    ];

    it.each(nonAcceptedStatuses)(
      'should return contact: null for Business view when status is %s',
      async (status) => {
        const inquiryFixture = {
          ...baseInquiryRecord,
          status,
          respondedAt: status === InquiryStatus.REJECTED ? new Date('2026-09-11T12:00:00Z') : null,
          closedAt: status === InquiryStatus.CLOSED ? new Date('2026-09-15T12:00:00Z') : null,
        };

        jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(inquiryFixture as any);

        const res = await request(app)
          .get(`/api/v1/inquiries/${mockInquiryIdA}`)
          .set('Authorization', 'Bearer biz-token');

        expect(res.status).toBe(200);
        expect(res.body.inquiry.status).toBe(status);
        expect(res.body.inquiry.contact).toBeNull();
      }
    );

    it.each(nonAcceptedStatuses)(
      'should return contact: null for Creator view when status is %s',
      async (status) => {
        verifyIdTokenSpy.mockResolvedValue({
          uid: mockCreatorUserA.firebaseUid,
          email: mockCreatorUserA.email,
          email_verified: true,
        } as any);
        jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);

        const inquiryFixture = {
          ...baseInquiryRecord,
          status,
          respondedAt: status === InquiryStatus.REJECTED ? new Date('2026-09-11T12:00:00Z') : null,
          closedAt: status === InquiryStatus.CLOSED ? new Date('2026-09-15T12:00:00Z') : null,
        };

        jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(inquiryFixture as any);

        const res = await request(app)
          .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
          .set('Authorization', 'Bearer creator-token');

        expect(res.status).toBe(200);
        expect(res.body.inquiry.status).toBe(status);
        expect(res.body.inquiry.contact).toBeNull();
      }
    );
  });

  // ─── 4. ACCEPTED INQUIRY POSITIVE CONTACT REVEAL ───────────────────────────
  describe('4. Accepted Inquiry Positive Contact Reveal', () => {
    it('should return complete creator contact to authenticated Business when inquiry is ACCEPTED', async () => {
      const acceptedInquiryFixture = {
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        respondedAt: new Date('2026-09-11T09:00:00Z'),
      };

      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(acceptedInquiryFixture as any);

      const res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      const inq = res.body.inquiry;
      expect(inq.status).toBe('ACCEPTED');

      // Contact must be populated with creator data
      expect(inq.contact).toEqual({
        name: 'Elena Rostova',
        collaborationEmail: 'direct-collab@elenarostova.com',
        instagramUrl: 'https://instagram.com/elenarostova',
        youtubeUrl: 'https://youtube.com/@elenarostova',
      });
    });

    it('should return complete business contact to authenticated Creator when inquiry is ACCEPTED', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);

      const acceptedInquiryFixture = {
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        respondedAt: new Date('2026-09-11T09:00:00Z'),
      };

      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(acceptedInquiryFixture as any);

      const res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      const inq = res.body.inquiry;
      expect(inq.status).toBe('ACCEPTED');

      // Contact must be populated with business data
      expect(inq.contact).toEqual({
        businessName: 'Lumina Studio',
        collaborationEmail: 'collab-partnerships@luminastudio.com',
        websiteUrl: 'https://luminastudio.example.com',
        instagramUrl: 'https://instagram.com/luminastudio',
      });
    });
  });

  // ─── 5. NULL EMAIL HANDLING & STRICT NO-FALLBACK TO USER.EMAIL ─────────────
  describe('5. Null collaborationEmail & Strict No-Fallback to User.email', () => {
    it('should return collaborationEmail: null when Creator has not configured one (NEVER User.email)', async () => {
      const acceptedInquiryWithNullEmail = {
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        respondedAt: new Date('2026-09-11T09:00:00Z'),
        creator: {
          ...baseInquiryRecord.creator,
          creatorProfile: {
            ...mockCreatorProfileA,
            collaborationEmail: null,
          },
        },
      };

      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(acceptedInquiryWithNullEmail as any);

      const res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.contact.collaborationEmail).toBeNull();
      // Ensure private authentication User.email is never leaked
      expect(JSON.stringify(res.body)).not.toContain(mockCreatorUserA.email);
    });

    it('should return collaborationEmail: null when Business has not configured one (NEVER User.email)', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);

      const acceptedInquiryWithNullEmail = {
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        respondedAt: new Date('2026-09-11T09:00:00Z'),
        business: {
          ...baseInquiryRecord.business,
          businessProfile: {
            ...mockBusinessProfileA,
            collaborationEmail: null,
          },
        },
      };

      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(acceptedInquiryWithNullEmail as any);

      const res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.contact.collaborationEmail).toBeNull();
      // Ensure private authentication User.email is never leaked
      expect(JSON.stringify(res.body)).not.toContain(mockBusinessUserA.email);
    });
  });

  // ─── 6. PARTNER ACCOUNT INACTIVE OR DELETED INVALIDATION ───────────────────
  describe('6. Partner Account Inactive / Deleted Invalidation', () => {
    it('should return contact: null for Business if Creator account is DELETED', async () => {
      const deletedPartnerInquiry = {
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        creator: {
          ...baseInquiryRecord.creator,
          status: AccountStatus.DELETED,
          deletedAt: new Date('2026-09-12T00:00:00Z'),
        },
      };

      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(deletedPartnerInquiry as any);

      const res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.contact).toBeNull();
    });

    it('should return contact: null for Creator if Business account is DELETED', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);

      const deletedPartnerInquiry = {
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        business: {
          ...baseInquiryRecord.business,
          status: AccountStatus.DELETED,
          deletedAt: new Date('2026-09-12T00:00:00Z'),
        },
      };

      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(deletedPartnerInquiry as any);

      const res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.contact).toBeNull();
    });
  });

  // ─── 7. PUBLIC PROFILES PRIVACY REGRESSION CHECK ───────────────────────────
  describe('7. Public Profile Privacy Regression Check', () => {
    it('should never expose collaborationEmail on GET /api/v1/creators/:creatorId', async () => {
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        ...mockCreatorProfileA,
        user: { status: 'ACTIVE', role: UserRole.CREATOR },
      } as any);

      const res = await request(app).get(`/api/v1/creators/${mockCreatorProfileA.id}`);

      expect(res.status).toBe(200);
      expect(res.body.profile).toBeDefined();
      expect(res.body.profile.collaborationEmail).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('direct-collab@elenarostova.com');
    });

    it('should never expose collaborationEmail on GET /api/v1/businesses/:businessId', async () => {
      const findUniqueSpy = jest.spyOn(prisma.businessProfile, 'findUnique').mockResolvedValue({
        id: mockBusinessProfileA.id,
        userId: mockBusinessUserA.id,
        businessName: mockBusinessProfileA.businessName,
        category: mockBusinessProfileA.category,
        description: mockBusinessProfileA.description,
        city: mockBusinessProfileA.city,
        stateOrProvince: mockBusinessProfileA.stateOrProvince,
        country: mockBusinessProfileA.country,
        logoUrl: mockBusinessProfileA.logoUrl,
        websiteUrl: mockBusinessProfileA.websiteUrl,
        instagramUrl: mockBusinessProfileA.instagramUrl,
        createdAt: mockBusinessProfileA.createdAt,
        updatedAt: mockBusinessProfileA.updatedAt,
      } as any);

      const res = await request(app).get(`/api/v1/businesses/${mockBusinessProfileA.id}`);

      expect(res.status).toBe(200);
      expect(res.body.profile).toBeDefined();
      expect(res.body.profile.collaborationEmail).toBeUndefined();
      expect(res.body.profile).not.toHaveProperty('collaborationEmail');
      expect(JSON.stringify(res.body)).not.toContain('collab-partnerships@luminastudio.com');

      // Verify PUBLIC_BUSINESS_SELECT was strictly utilized (neither collaborationEmail nor internal userId)
      expect(findUniqueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockBusinessProfileA.id },
          select: expect.not.objectContaining({
            collaborationEmail: true,
            userId: true,
          }),
        })
      );
    });

  });

  // ─── 8. INTERNAL IDENTIFIERS PRIVACY AUDIT ─────────────────────────────────
  describe('8. Internal Identifiers Privacy Audit', () => {
    it('should confirm inquiry responses never expose firebaseUid or auth User.email', async () => {
      const acceptedInquiryFixture = {
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        respondedAt: new Date('2026-09-11T09:00:00Z'),
      };

      jest.spyOn(prisma.inquiry, 'findUnique').mockResolvedValue(acceptedInquiryFixture as any);

      const res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      const rawBody = JSON.stringify(res.body);

      // Must not contain firebaseUid
      expect(rawBody).not.toContain('firebaseUid');
      expect(rawBody).not.toContain('fb-biz-user-11a');
      expect(rawBody).not.toContain('fb-creator-user-11a');

      // Must not contain user authentication email
      expect(rawBody).not.toContain(mockBusinessUserA.email);
      expect(rawBody).not.toContain(mockCreatorUserA.email);
    });
  });

  // ─── 9. ACCOUNT DEACTIVATION & REACTIVATION CONTACT WITHHOLDING LIFECYCLE ──
  describe('9. Account Deactivation & Reactivation Contact Withholding Lifecycle', () => {
    it('should withhold Creator contact info when Creator becomes DEACTIVATED, and restore upon reactivation', async () => {
      // 1. Initial State: ACCEPTED inquiry between Business A and Creator A (both ACTIVE)
      const activeInquiry = {
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        respondedAt: new Date('2026-09-11T09:00:00Z'),
        creator: {
          id: mockCreatorUserA.id,
          status: AccountStatus.ACTIVE,
          deletedAt: null,
          creatorProfile: mockCreatorProfileA,
        },
      };

      const findUniqueSpy = jest.spyOn(prisma.inquiry, 'findUnique');
      findUniqueSpy.mockResolvedValue(activeInquiry as any);

      // Step 2: While both are ACTIVE, contact information is returned to Business
      let res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.contact).not.toBeNull();
      expect(res.body.inquiry.contact.collaborationEmail).toBe('direct-collab@elenarostova.com');
      expect(res.body.inquiry.contact.instagramUrl).toBe('https://instagram.com/elenarostova');

      // Step 3 & 4: Creator becomes DEACTIVATED
      const deactivatedCreatorInquiry = {
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        respondedAt: new Date('2026-09-11T09:00:00Z'),
        creator: {
          id: mockCreatorUserA.id,
          status: AccountStatus.DEACTIVATED,
          deletedAt: null,
          creatorProfile: mockCreatorProfileA,
        },
      };
      findUniqueSpy.mockResolvedValue(deactivatedCreatorInquiry as any);

      // Step 5: Business requests inquiry detail -> Creator private contact info is WITHHELD (null)
      res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.contact).toBeNull();
      // Public profile data remains visible for historical context
      expect(res.body.inquiry.creator.name).toBe('Elena Rostova');

      // Step 6 & 7: Creator REACTIVATES back to ACTIVE
      const reactivatedCreatorInquiry = {
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        respondedAt: new Date('2026-09-11T09:00:00Z'),
        creator: {
          id: mockCreatorUserA.id,
          status: AccountStatus.ACTIVE,
          deletedAt: null,
          creatorProfile: mockCreatorProfileA,
        },
      };
      findUniqueSpy.mockResolvedValue(reactivatedCreatorInquiry as any);

      // Step 8: Business requests inquiry detail -> Contact information becomes AVAILABLE again
      res = await request(app)
        .get(`/api/v1/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer biz-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.contact).not.toBeNull();
      expect(res.body.inquiry.contact.collaborationEmail).toBe('direct-collab@elenarostova.com');
    });

    it('should withhold Business contact info when Business becomes DEACTIVATED, and restore upon reactivation', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUserA.firebaseUid,
        email: mockCreatorUserA.email,
        email_verified: true,
      } as any);
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUserA as any);

      const findUniqueSpy = jest.spyOn(prisma.inquiry, 'findUnique');

      // 1. Both ACTIVE
      findUniqueSpy.mockResolvedValue({
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        respondedAt: new Date('2026-09-11T09:00:00Z'),
        business: {
          id: mockBusinessUserA.id,
          status: AccountStatus.ACTIVE,
          deletedAt: null,
          businessProfile: mockBusinessProfileA,
        },
      } as any);

      let res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.contact).not.toBeNull();
      expect(res.body.inquiry.contact.collaborationEmail).toBe('collab-partnerships@luminastudio.com');

      // 2. Business DEACTIVATED -> contact withheld
      findUniqueSpy.mockResolvedValue({
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        respondedAt: new Date('2026-09-11T09:00:00Z'),
        business: {
          id: mockBusinessUserA.id,
          status: AccountStatus.DEACTIVATED,
          deletedAt: null,
          businessProfile: mockBusinessProfileA,
        },
      } as any);

      res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.contact).toBeNull();

      // 3. Business REACTIVATED -> contact restored
      findUniqueSpy.mockResolvedValue({
        ...baseInquiryRecord,
        status: InquiryStatus.ACCEPTED,
        respondedAt: new Date('2026-09-11T09:00:00Z'),
        business: {
          id: mockBusinessUserA.id,
          status: AccountStatus.ACTIVE,
          deletedAt: null,
          businessProfile: mockBusinessProfileA,
        },
      } as any);

      res = await request(app)
        .get(`/api/v1/creators/me/inquiries/${mockInquiryIdA}`)
        .set('Authorization', 'Bearer creator-token');

      expect(res.status).toBe(200);
      expect(res.body.inquiry.contact).not.toBeNull();
      expect(res.body.inquiry.contact.collaborationEmail).toBe('collab-partnerships@luminastudio.com');
    });
  });
});
