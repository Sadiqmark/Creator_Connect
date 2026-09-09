import request from 'supertest';
import { app } from '../src/app';
import { firebaseAdminAuth } from '../src/config/firebase';
import prisma from '../src/database/prisma';
import { UserRole, AccountStatus } from '@prisma/client';

describe('Phase 6B Business Saved Creators Test Suite', () => {
  let verifyIdTokenSpy: jest.SpyInstance;

  const mockBusinessUser = {
    id: 'b1000000-0000-4000-8000-000000000001',
    firebaseUid: 'firebase_biz_1',
    email: 'business@example.com',
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

  const sampleCreatorProfile = {
    id: 'cp-001',
    userId: mockCreatorUser.id,
    name: 'Elena Rostova',
    niche: 'Fashion',
    location: 'Milan, Italy',
    bio: 'High-fashion editorial stylist and visual creator.',
    specialties: ['Fashion Styling', 'Photography'],
    instagramUrl: 'https://instagram.com/elenarostova',
    youtubeUrl: null,
    profilePhotoUrl: 'https://storage.googleapis.com/test/photo1.jpg',
    collaborationEmail: 'elena.private@agency.com',
    user: {
      id: mockCreatorUser.id,
      role: UserRole.CREATOR,
      status: 'ACTIVE',
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

  describe('1. Authentication & Authorization Guards', () => {
    it('should return 401 when accessing POST /api/v1/saved-creators/:creatorId unauthenticated', async () => {
      const res = await request(app).post('/api/v1/saved-creators/cp-001');
      expect(res.status).toBe(401);
    });

    it('should return 401 when accessing DELETE /api/v1/saved-creators/:creatorId unauthenticated', async () => {
      const res = await request(app).delete('/api/v1/saved-creators/cp-001');
      expect(res.status).toBe(401);
    });

    it('should return 401 when accessing GET /api/v1/saved-creators unauthenticated', async () => {
      const res = await request(app).get('/api/v1/saved-creators');
      expect(res.status).toBe(401);
    });

    it('should return 403 FORBIDDEN_ROLE when a CREATOR attempts to save a creator', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const res = await request(app)
        .post('/api/v1/saved-creators/cp-001')
        .set('Authorization', 'Bearer valid-creator-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should return 403 FORBIDDEN_ROLE when a CREATOR attempts to list saved creators', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const res = await request(app)
        .get('/api/v1/saved-creators')
        .set('Authorization', 'Bearer valid-creator-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should return 403 FORBIDDEN_ROLE when a CREATOR attempts to unsave a creator', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockCreatorUser.firebaseUid,
        email: mockCreatorUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockCreatorUser as any);

      const res = await request(app)
        .delete('/api/v1/saved-creators/cp-001')
        .set('Authorization', 'Bearer valid-creator-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });
  });

  describe('2. POST /api/v1/saved-creators/:creatorId — Save Creator', () => {
    it('should allow Business to save an active, complete creator and return 201', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue(sampleCreatorProfile as any);
      jest.spyOn(prisma.savedCreator, 'create').mockResolvedValue({
        id: 'sc-100',
        businessId: mockBusinessUser.id,
        creatorId: mockCreatorUser.id,
        createdAt: new Date('2026-02-01'),
      } as any);

      const res = await request(app)
        .post('/api/v1/saved-creators/cp-001')
        .set('Authorization', 'Bearer valid-biz-token');

      expect(res.status).toBe(201);
      expect(res.body.savedCreator).toBeDefined();
      expect(res.body.savedCreator.id).toBe('sc-100');
      expect(res.body.savedCreator.creator.id).toBe('cp-001');
      expect(res.body.savedCreator.creator.name).toBe('Elena Rostova');

      // Privacy check: collaborationEmail and internal IDs omitted
      expect(res.body.savedCreator.creator.collaborationEmail).toBeUndefined();
      expect(res.body.savedCreator.creator).not.toHaveProperty('collaborationEmail');
      expect(res.body.savedCreator.creator.userId).toBeUndefined();
      expect(res.body.savedCreator.creator).not.toHaveProperty('userId');
    });

    it('should return 409 DUPLICATE_SAVED_CREATOR on duplicate save attempt', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue(sampleCreatorProfile as any);

      const p2002Error: any = new Error('Unique constraint failed on the fields: (`business_id`,`creator_id`)');
      p2002Error.code = 'P2002';
      jest.spyOn(prisma.savedCreator, 'create').mockRejectedValue(p2002Error);

      const res = await request(app)
        .post('/api/v1/saved-creators/cp-001')
        .set('Authorization', 'Bearer valid-biz-token');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_SAVED_CREATOR');
    });

    it('should return 404 when saving nonexistent creator profile', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/saved-creators/nonexistent-id')
        .set('Authorization', 'Bearer valid-biz-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CREATOR_NOT_FOUND');
    });

    it('should return 404 when saving inactive creator', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        ...sampleCreatorProfile,
        user: { id: mockCreatorUser.id, role: UserRole.CREATOR, status: 'DELETED' },
      } as any);

      const res = await request(app)
        .post('/api/v1/saved-creators/cp-001')
        .set('Authorization', 'Bearer valid-biz-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CREATOR_NOT_FOUND');
    });
  });

  describe('3. DELETE /api/v1/saved-creators/:creatorId — Unsave Creator', () => {
    it('should allow Business to unsave an existing saved creator', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        id: 'cp-001',
        userId: mockCreatorUser.id,
      } as any);
      jest.spyOn(prisma.savedCreator, 'deleteMany').mockResolvedValue({ count: 1 });

      const res = await request(app)
        .delete('/api/v1/saved-creators/cp-001')
        .set('Authorization', 'Bearer valid-biz-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 SAVED_CREATOR_NOT_FOUND when record was not saved', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        id: 'cp-001',
        userId: mockCreatorUser.id,
      } as any);
      jest.spyOn(prisma.savedCreator, 'deleteMany').mockResolvedValue({ count: 0 });

      const res = await request(app)
        .delete('/api/v1/saved-creators/cp-001')
        .set('Authorization', 'Bearer valid-biz-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SAVED_CREATOR_NOT_FOUND');
    });
  });

  describe('4. GET /api/v1/saved-creators — List Saved Creators', () => {
    it('should return paginated saved creators for the authenticated business', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
      jest.spyOn(prisma.savedCreator, 'count').mockResolvedValue(1);
      jest.spyOn(prisma.savedCreator, 'findMany').mockResolvedValue([
        {
          id: 'sc-100',
          businessId: mockBusinessUser.id,
          creatorId: mockCreatorUser.id,
          createdAt: new Date('2026-02-01'),
          creator: {
            creatorProfile: {
              id: 'cp-001',
              name: 'Elena Rostova',
              profilePhotoUrl: null,
              niche: 'Fashion',
              location: 'Milan, Italy',
              bio: 'Editorial stylist.',
              specialties: ['Fashion Styling'],
              instagramUrl: 'https://instagram.com/elena',
              youtubeUrl: null,
            },
          },
        },
      ] as any);

      const res = await request(app)
        .get('/api/v1/saved-creators')
        .set('Authorization', 'Bearer valid-biz-token');

      expect(res.status).toBe(200);
      expect(res.body.savedCreators).toHaveLength(1);
      expect(res.body.savedCreators[0].creator.id).toBe('cp-001');
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 24,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });

      // Privacy audit
      expect(res.body.savedCreators[0].creator.collaborationEmail).toBeUndefined();
      expect(res.body.savedCreators[0].creator).not.toHaveProperty('collaborationEmail');
    });

    it('should return list of saved CreatorProfile IDs on GET /api/v1/saved-creators/ids', async () => {
      verifyIdTokenSpy.mockResolvedValue({
        uid: mockBusinessUser.firebaseUid,
        email: mockBusinessUser.email,
        email_verified: true,
      } as any);

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockBusinessUser as any);
      jest.spyOn(prisma.savedCreator, 'findMany').mockResolvedValue([
        {
          creator: {
            creatorProfile: { id: 'cp-001' },
          },
        },
        {
          creator: {
            creatorProfile: { id: 'cp-002' },
          },
        },
      ] as any);

      const res = await request(app)
        .get('/api/v1/saved-creators/ids')
        .set('Authorization', 'Bearer valid-biz-token');

      expect(res.status).toBe(200);
      expect(res.body.ids).toEqual(['cp-001', 'cp-002']);
    });
  });
});
