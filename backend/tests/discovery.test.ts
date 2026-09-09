import request from 'supertest';
import { app } from '../src/app';
import prisma from '../src/database/prisma';

describe('Phase 6B Creator Discovery & Details Test Suite', () => {
  const mockCreatorUser = {
    id: 'c1000000-0000-4000-8000-000000000001',
    status: 'ACTIVE',
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
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-15'),
    user: { status: 'ACTIVE' },
  };

  const sampleCreatorProfile2 = {
    id: 'cp-002',
    userId: 'c1000000-0000-4000-8000-000000000002',
    name: 'Marco Rossi',
    niche: 'Food & Beverage',
    location: 'Rome, Italy',
    bio: 'Artisanal pasta maker and culinary storyteller.',
    specialties: ['Food & Recipes', 'YouTube Long-form'],
    instagramUrl: null,
    youtubeUrl: 'https://youtube.com/@marcocooks',
    profilePhotoUrl: null,
    collaborationEmail: 'marco.private@kitchen.com',
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-10'),
    user: { status: 'ACTIVE' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. GET /api/v1/creators — Discovery Listing & Pagination', () => {
    it('should return successful listing with default pagination (limit 24, page 1)', async () => {
      jest.spyOn(prisma.creatorProfile, 'count').mockResolvedValue(2);
      jest.spyOn(prisma.creatorProfile, 'findMany').mockResolvedValue([
        sampleCreatorProfile,
        sampleCreatorProfile2,
      ] as any);

      const res = await request(app).get('/api/v1/creators');

      expect(res.status).toBe(200);
      expect(res.body.creators).toHaveLength(2);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 24,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });

      // Check exact 9 public fields
      const creator = res.body.creators[0];
      expect(creator).toHaveProperty('id', 'cp-001');
      expect(creator).toHaveProperty('name', 'Elena Rostova');
      expect(creator).toHaveProperty('profilePhotoUrl', 'https://storage.googleapis.com/test/photo1.jpg');
      expect(creator).toHaveProperty('niche', 'Fashion');
      expect(creator).toHaveProperty('location', 'Milan, Italy');
      expect(creator).toHaveProperty('bio', 'High-fashion editorial stylist and visual creator.');
      expect(creator).toHaveProperty('specialties', ['Fashion Styling', 'Photography']);
      expect(creator).toHaveProperty('instagramUrl', 'https://instagram.com/elenarostova');
      expect(creator).toHaveProperty('youtubeUrl', null);

      // Privacy verification: absolutely NO private or internal fields
      expect(creator.collaborationEmail).toBeUndefined();
      expect(creator).not.toHaveProperty('collaborationEmail');
      expect(creator.userId).toBeUndefined();
      expect(creator).not.toHaveProperty('userId');
      expect(creator.firebaseUid).toBeUndefined();
      expect(creator).not.toHaveProperty('firebaseUid');
      expect(creator.createdAt).toBeUndefined();
      expect(creator).not.toHaveProperty('createdAt');
      expect(creator.updatedAt).toBeUndefined();
      expect(creator).not.toHaveProperty('updatedAt');
    });

    it('should clamp limit to maximum 50 when higher limit is requested', async () => {
      const findManySpy = jest.spyOn(prisma.creatorProfile, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.creatorProfile, 'count').mockResolvedValue(0);

      const res = await request(app).get('/api/v1/creators?limit=100&page=1');

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(50);
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should handle custom page and calculate pagination metadata correctly', async () => {
      jest.spyOn(prisma.creatorProfile, 'count').mockResolvedValue(55);
      const findManySpy = jest.spyOn(prisma.creatorProfile, 'findMany').mockResolvedValue([sampleCreatorProfile] as any);

      const res = await request(app).get('/api/v1/creators?page=2&limit=20');

      expect(res.status).toBe(200);
      expect(res.body.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 55,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      });
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      );
    });

    it('should query with deterministic ordering (updatedAt desc, id desc)', async () => {
      const findManySpy = jest.spyOn(prisma.creatorProfile, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.creatorProfile, 'count').mockResolvedValue(0);

      await request(app).get('/api/v1/creators');

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        })
      );
    });
  });

  describe('2. GET /api/v1/creators — Search and Filter Parameters', () => {
    it('should apply search query q to name, niche, location, and bio', async () => {
      const findManySpy = jest.spyOn(prisma.creatorProfile, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.creatorProfile, 'count').mockResolvedValue(0);

      await request(app).get('/api/v1/creators?q=Elena');

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [
                  { name: { contains: 'Elena', mode: 'insensitive' } },
                  { niche: { contains: 'Elena', mode: 'insensitive' } },
                  { location: { contains: 'Elena', mode: 'insensitive' } },
                  { bio: { contains: 'Elena', mode: 'insensitive' } },
                ],
              }),
            ]),
          },
        })
      );
    });

    it('should filter by niche', async () => {
      const findManySpy = jest.spyOn(prisma.creatorProfile, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.creatorProfile, 'count').mockResolvedValue(0);

      await request(app).get('/api/v1/creators?niche=Fashion');

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              { niche: { equals: 'Fashion', mode: 'insensitive' } },
            ]),
          },
        })
      );
    });

    it('should filter by city against location field', async () => {
      const findManySpy = jest.spyOn(prisma.creatorProfile, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.creatorProfile, 'count').mockResolvedValue(0);

      await request(app).get('/api/v1/creators?city=Milan');

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              { location: { contains: 'Milan', mode: 'insensitive' } },
            ]),
          },
        })
      );
    });

    it('should filter by country against location field', async () => {
      const findManySpy = jest.spyOn(prisma.creatorProfile, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.creatorProfile, 'count').mockResolvedValue(0);

      await request(app).get('/api/v1/creators?country=Italy');

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              { location: { contains: 'Italy', mode: 'insensitive' } },
            ]),
          },
        })
      );
    });

    it('should combine niche, city, country, and search filters', async () => {
      const findManySpy = jest.spyOn(prisma.creatorProfile, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.creatorProfile, 'count').mockResolvedValue(0);

      await request(app).get('/api/v1/creators?q=style&niche=Fashion&city=Milan&country=Italy');

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              { niche: { equals: 'Fashion', mode: 'insensitive' } },
              { location: { contains: 'Milan', mode: 'insensitive' } },
              { location: { contains: 'Italy', mode: 'insensitive' } },
              expect.objectContaining({
                OR: [
                  { name: { contains: 'style', mode: 'insensitive' } },
                  { niche: { contains: 'style', mode: 'insensitive' } },
                  { location: { contains: 'style', mode: 'insensitive' } },
                  { bio: { contains: 'style', mode: 'insensitive' } },
                ],
              }),
            ]),
          },
        })
      );
    });

    it('should return empty list when no creators match filters', async () => {
      jest.spyOn(prisma.creatorProfile, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.creatorProfile, 'findMany').mockResolvedValue([]);

      const res = await request(app).get('/api/v1/creators?q=NonExistentPersonXYZ');

      expect(res.status).toBe(200);
      expect(res.body.creators).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    it('should exclude creators with empty specialties from returned discovery results', async () => {
      jest.spyOn(prisma.creatorProfile, 'count').mockResolvedValue(2);
      jest.spyOn(prisma.creatorProfile, 'findMany').mockResolvedValue([
        sampleCreatorProfile,
        {
          ...sampleCreatorProfile2,
          specialties: [], // Empty specialties array -> not discoverable
        },
      ] as any);

      const res = await request(app).get('/api/v1/creators');

      expect(res.status).toBe(200);
      expect(res.body.creators).toHaveLength(1);
      expect(res.body.creators[0].id).toBe('cp-001');
    });
  });

  describe('3. GET /api/v1/creators/:creatorId — Public Creator Profile Details', () => {
    it('should return 200 and safe public DTO for an active, complete creator', async () => {
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        ...sampleCreatorProfile,
        user: { status: 'ACTIVE' },
      } as any);

      const res = await request(app).get('/api/v1/creators/cp-001');

      expect(res.status).toBe(200);
      expect(res.body.profile).toEqual({
        id: 'cp-001',
        name: 'Elena Rostova',
        profilePhotoUrl: 'https://storage.googleapis.com/test/photo1.jpg',
        niche: 'Fashion',
        location: 'Milan, Italy',
        bio: 'High-fashion editorial stylist and visual creator.',
        specialties: ['Fashion Styling', 'Photography'],
        instagramUrl: 'https://instagram.com/elenarostova',
        youtubeUrl: null,
      });

      // Strict privacy check
      expect(res.body.profile.collaborationEmail).toBeUndefined();
      expect(res.body.profile).not.toHaveProperty('collaborationEmail');
      expect(res.body.profile.userId).toBeUndefined();
      expect(res.body.profile.createdAt).toBeUndefined();
      expect(res.body.profile.updatedAt).toBeUndefined();
    });

    it('should return 404 CREATOR_NOT_FOUND when creator does not exist', async () => {
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue(null);

      const res = await request(app).get('/api/v1/creators/nonexistent-id');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CREATOR_NOT_FOUND');
    });

    it('should return 404 when creator user status is DELETED or INACTIVE', async () => {
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        ...sampleCreatorProfile,
        user: { status: 'DELETED' },
      } as any);

      const res = await request(app).get('/api/v1/creators/cp-001');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CREATOR_NOT_FOUND');
    });

    it('should return 404 when creator profile is missing required fields (binary discoverability)', async () => {
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        ...sampleCreatorProfile,
        bio: '', // Empty bio -> incomplete
        user: { status: 'ACTIVE' },
      } as any);

      const res = await request(app).get('/api/v1/creators/cp-001');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CREATOR_NOT_FOUND');
    });

    it('should return 404 when creator has no social profiles', async () => {
      jest.spyOn(prisma.creatorProfile, 'findUnique').mockResolvedValue({
        ...sampleCreatorProfile,
        instagramUrl: null,
        youtubeUrl: null, // Neither Instagram nor YouTube -> incomplete
        user: { status: 'ACTIVE' },
      } as any);

      const res = await request(app).get('/api/v1/creators/cp-001');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('CREATOR_NOT_FOUND');
    });
  });
});
