import request from 'supertest';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';
import prisma from '../src/database/prisma';
import { UserRole, AccountStatus } from '@prisma/client';

describe('Phase 4B Profile Management & Privacy Test Suite', () => {
  let verifyIdTokenSpy: jest.SpyInstance;

  const mockCreatorUser = {
    id: 'c1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_creator_uid_1',
    email: 'creator@example.com',
    role: UserRole.CREATOR,
    status: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockBusinessUser = {
    id: 'b1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_business_uid_1',
    email: 'business@example.com',
    role: UserRole.BUSINESS,
    status: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
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

  describe('1. Unauthenticated & Role-Based Access Control', () => {
    it('should return 401 when accessing GET /api/v1/creators/me without auth', async () => {
      const res = await request(app).get('/api/v1/creators/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 401 when accessing GET /api/v1/businesses/me without auth', async () => {
      const res = await request(app).get('/api/v1/businesses/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject BUSINESS role accessing GET /api/v1/creators/me with 403 FORBIDDEN_ROLE', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);

      const res = await request(app)
        .get('/api/v1/creators/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should reject CREATOR role accessing GET /api/v1/businesses/me with 403 FORBIDDEN_ROLE', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const res = await request(app)
        .get('/api/v1/businesses/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });

  describe('2. Creator Profile Upsert & Validation', () => {
    it('should reject profile upsert if neither Instagram nor YouTube URL is provided', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const res = await request(app)
        .patch('/api/v1/creators/me')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Sarah Connor',
          niche: 'Fitness',
          location: 'Los Angeles, CA',
          bio: 'Fitness and lifestyle creator.',
          specialties: ['Fitness', 'Nutrition'],
          collaborationEmail: 'collab@example.com',
          // No instagramUrl or youtubeUrl
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should upsert profile and compute isDiscoverable=true when complete', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const upsertedRecord = {
        id: 'cp-001',
        userId: mockCreatorUser.id,
        name: 'Sarah Connor',
        niche: 'Fitness',
        location: 'Los Angeles, CA',
        bio: 'Fitness and lifestyle creator.',
        specialties: ['Fitness', 'Nutrition'],
        instagramUrl: 'https://instagram.com/sarahconnor',
        youtubeUrl: null,
        collaborationEmail: 'collab@example.com',
        profilePhotoUrl: 'https://images.unsplash.com/photo-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.creatorProfile, 'upsert').mockResolvedValue(upsertedRecord as any);

      const res = await request(app)
        .patch('/api/v1/creators/me')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Sarah Connor',
          niche: 'Fitness',
          location: 'Los Angeles, CA',
          bio: 'Fitness and lifestyle creator.',
          specialties: ['Fitness', 'Nutrition'],
          instagramUrl: 'https://instagram.com/sarahconnor',
          collaborationEmail: 'collab@example.com',
          profilePhotoUrl: 'https://images.unsplash.com/photo-1',
        });

      expect(res.status).toBe(200);
      expect(res.body.profile.isDiscoverable).toBe(true);
      expect(res.body.profile.name).toBe('Sarah Connor');
      expect(res.body.profile.collaborationEmail).toBe('collab@example.com');
    });
  });

  describe('3. Privacy Boundary: Collaboration Email Leak Prevention', () => {
    it('should include collaborationEmail in private GET /api/v1/creators/me', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        id: 'cp-001',
        userId: mockCreatorUser.id,
        name: 'Sarah Connor',
        niche: 'Fitness',
        location: 'Los Angeles, CA',
        bio: 'Fitness bio.',
        specialties: ['Fitness'],
        instagramUrl: 'https://instagram.com/sarah',
        youtubeUrl: null,
        collaborationEmail: 'private-collab@example.com',
        profilePhotoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .get('/api/v1/creators/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.profile.collaborationEmail).toBe('private-collab@example.com');
    });

    it('should strictly EXCLUDE collaborationEmail in public GET /api/v1/creators/:creatorId', async () => {
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        id: 'cp-001',
        userId: mockCreatorUser.id,
        name: 'Sarah Connor',
        niche: 'Fitness',
        location: 'Los Angeles, CA',
        bio: 'Fitness bio.',
        specialties: ['Fitness'],
        instagramUrl: 'https://instagram.com/sarah',
        youtubeUrl: null,
        profilePhotoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app).get('/api/v1/creators/cp-001');

      expect(res.status).toBe(200);
      expect(res.body.profile.name).toBe('Sarah Connor');
      expect(res.body.profile.collaborationEmail).toBeUndefined();
      expect(res.body.profile).not.toHaveProperty('collaborationEmail');
    });

    it('should strictly EXCLUDE collaborationEmail in public GET /api/v1/businesses/:businessId', async () => {
      jest.spyOn(prisma.businessProfile, 'findUnique').mockResolvedValue({
        id: 'bp-001',
        userId: mockBusinessUser.id,
        businessName: 'Acme Corp',
        category: 'Technology',
        description: 'Tech brand.',
        city: 'San Francisco',
        stateOrProvince: 'CA',
        country: 'USA',
        logoUrl: null,
        websiteUrl: 'https://acme.com',
        instagramUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app).get('/api/v1/businesses/bp-001');

      expect(res.status).toBe(200);
      expect(res.body.profile.businessName).toBe('Acme Corp');
      expect(res.body.profile.collaborationEmail).toBeUndefined();
      expect(res.body.profile).not.toHaveProperty('collaborationEmail');
    });

    it('should include collaborationEmail in private GET /api/v1/businesses/me', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);

      jest.spyOn(prisma.businessProfile, 'findUnique').mockResolvedValue({
        id: 'bp-001',
        userId: mockBusinessUser.id,
        businessName: 'Acme Corp',
        category: 'Technology',
        description: 'Tech brand.',
        city: 'San Francisco',
        stateOrProvince: 'CA',
        country: 'USA',
        collaborationEmail: 'biz-collab@acme.com',
        logoUrl: null,
        websiteUrl: 'https://acme.com',
        instagramUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .get('/api/v1/businesses/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.profile.collaborationEmail).toBe('biz-collab@acme.com');
    });

    it('should strictly EXCLUDE collaborationEmail in public discovery GET /api/v1/creators', async () => {
      jest.spyOn(prisma.creatorProfile, 'findMany').mockResolvedValue([
        {
          id: 'cp-001',
          userId: mockCreatorUser.id,
          name: 'Sarah Connor',
          niche: 'Fitness',
          location: 'Los Angeles, CA',
          bio: 'Fitness bio.',
          specialties: ['Fitness'],
          instagramUrl: 'https://instagram.com/sarah',
          youtubeUrl: null,
          profilePhotoUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const res = await request(app).get('/api/v1/creators');

      expect(res.status).toBe(200);
      expect(res.body.creators).toHaveLength(1);
      expect(res.body.creators[0].name).toBe('Sarah Connor');
      expect(res.body.creators[0].collaborationEmail).toBeUndefined();
      expect(res.body.creators[0]).not.toHaveProperty('collaborationEmail');
    });

    it('should strictly EXCLUDE collaborationEmail when another creator views a public creator profile', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: 'firebase_other_creator',
        email: 'other@creator.com',
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'c-other-002',
        role: UserRole.CREATOR,
        status: AccountStatus.ACTIVE,
      } as any);

      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        id: 'cp-001',
        userId: mockCreatorUser.id,
        name: 'Sarah Connor',
        niche: 'Fitness',
        location: 'Los Angeles, CA',
        bio: 'Fitness bio.',
        specialties: ['Fitness'],
        instagramUrl: 'https://instagram.com/sarah',
        youtubeUrl: null,
        profilePhotoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .get('/api/v1/creators/cp-001')
        .set('Authorization', 'Bearer valid-other-token');

      expect(res.status).toBe(200);
      expect(res.body.profile.name).toBe('Sarah Connor');
      expect(res.body.profile.collaborationEmail).toBeUndefined();
      expect(res.body.profile).not.toHaveProperty('collaborationEmail');
    });
  });

  describe('4. Dashboard Summary Endpoints', () => {
    it('should return aggregated creator dashboard metrics', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        name: 'Sarah',
        niche: 'Fitness',
        location: 'LA',
        bio: 'Bio',
        specialties: ['Fitness'],
        instagramUrl: 'https://instagram.com/sarah',
        youtubeUrl: null,
      } as any);
      jest.spyOn(prisma.inquiry, 'groupBy').mockResolvedValue([
        { status: 'PENDING', _count: { status: 3 } },
        { status: 'ACCEPTED', _count: { status: 2 } },
      ] as any);
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([] as any);

      const res = await request(app)
        .get('/api/v1/creators/me/dashboard')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.summary.inquiriesPending).toBe(3);
      expect(res.body.summary.inquiriesAccepted).toBe(2);
      expect(res.body.summary.inquiriesTotal).toBe(5);
    });

    it('should return aggregated business dashboard metrics', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
      jest.spyOn(prisma.savedCreator, 'count').mockResolvedValue(4);
      jest.spyOn(prisma.inquiry, 'groupBy').mockResolvedValue([
        { status: 'PENDING', _count: { status: 1 } },
        { status: 'ACCEPTED', _count: { status: 5 } },
      ] as any);
      jest.spyOn(prisma.inquiry, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prisma.savedCreator, 'findMany').mockResolvedValue([] as any);

      const res = await request(app)
        .get('/api/v1/businesses/me/dashboard')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.summary.savedCreatorsCount).toBe(4);
      expect(res.body.summary.inquiriesPending).toBe(1);
      expect(res.body.summary.inquiriesAccepted).toBe(5);
    });
  });
});
